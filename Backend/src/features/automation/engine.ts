import { pb } from '../../lib/pocketbase.js';
import type { FlowSummary, FlowCanvas, FlowNode, FlowEdge, FlowRun, FlowRunStep } from './types.js';
import { getNodeDefinition } from './nodes/nodeDefinitions.js';

// ============================================================================
// TYPES
// ============================================================================

interface ExecutionContext {
  input: Record<string, any>;
  event: Record<string, any>; // Original trigger event data
  vars: Record<string, any>;
  metadata?: Record<string, any>;
}

interface NodeExecutionResult {
  output: Record<string, any>;
  nextNodeId?: string;
  nextHandle?: string; // For conditional branching (e.g., "true" or "false")
}

// ============================================================================
// TEMPLATE VARIABLE SUBSTITUTION
// ============================================================================

/**
 * Replace {{path.to.value}} with actual values from context
 * Substitute template variables like {{input.customer_name}}
 */
function substituteVariables(template: string, context: ExecutionContext): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const trimmedPath = path.trim();
    const value = getByPath(context, trimmedPath);
    
    // Debug logging
    if (value === undefined || value === null) {
      console.log(`[substituteVariables] Could not resolve: ${trimmedPath}`);
      console.log(`[substituteVariables] Context keys:`, Object.keys(context));
      console.log(`[substituteVariables] Input keys:`, context.input ? Object.keys(context.input) : 'no input');
      console.log(`[substituteVariables] Event keys:`, context.event ? Object.keys(context.event) : 'no event');
    }
    
    return value !== undefined && value !== null ? String(value) : match;
  });
}

/**
 * Get value from object by dot-separated path
 * For ExecutionContext, tries input first, then falls back to event for paths starting with "input."
 */
function getByPath(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  
  // If not found and path starts with "input." and obj has event, try event instead
  if (current === undefined && obj.event && path.startsWith('input.')) {
    const eventPath = path.substring(6); // Remove "input." prefix
    current = obj.event;
    const eventParts = eventPath.split('.');
    for (const part of eventParts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
  }
  
  return current;
}

/**
 * Substitute variables in JSON object (recursive)
 */
function substituteInObject(obj: any, context: ExecutionContext): any {
  if (typeof obj === 'string') {
    return substituteVariables(obj, context);
  }
  if (Array.isArray(obj)) {
    return obj.map(item => substituteInObject(item, context));
  }
  if (obj && typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = substituteInObject(value, context);
    }
    return result;
  }
  return obj;
}

// ============================================================================
// NODE HANDLERS
// ============================================================================

/**
 * Execute trigger.journey node
 */
async function executeTriggerJourney(
  node: FlowNode,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  // Journey trigger just forwards the input event data
  return {
    output: {
      ...context.input,
      event: context.input.event || context.input,
      customer: context.input.customer,
    },
  };
}

/**
 * Execute trigger.cron node
 */
async function executeTriggerCron(
  node: FlowNode,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  // Cron trigger just forwards with timestamp info
  return {
    output: {
      ...context.input,
      triggered_at: new Date().toISOString(),
      trigger_type: 'cron',
    },
  };
}

/**
 * Execute pb.find node
 */
async function executePbFind(
  node: FlowNode,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  const config = node.data?.config as Record<string, any> || {};
  
  const collection = config.collection as string;
  if (!collection) {
    throw new Error('pb.find: collection is required');
  }

  // Substitute variables in filter
  let filterTemplate = config.filter as string || '';
  
  // Handle date placeholders
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  
  filterTemplate = filterTemplate
    .replace(/@todayStart/g, `"${todayStart.toISOString()}"`)
    .replace(/@yesterdayStart/g, `"${yesterdayStart.toISOString()}"`)
    .replace(/@now/g, `"${now.toISOString()}"`);
  
  const filter = substituteVariables(filterTemplate, context);
  
  const sort = (config.sort as string) || '-created';
  const limit = Number(config.limit) || 50;
  const page = Number(config.page) || 1;
  const expand = (config.expand as string) || '';

  console.log(`[pb.find] Querying ${collection} with filter: ${filter}`);

  try {
    const result = await pb.collection(collection).getList(page, limit, {
      filter: filter || undefined,
      sort,
      expand: expand || undefined,
    });

    // Build base output
    const output: Record<string, unknown> = {
      items: result.items,
      totalItems: result.totalItems,
      page: result.page,
      totalPages: result.totalPages,
    };

    // Add sales summary if querying orders collection
    if (collection === 'orders' && result.items.length > 0) {
      const today = new Date();
      const dateStr = today.toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      });
      
      // Calculate totals
      let totalSales = 0;
      let productCount = 0;
      
      for (const order of result.items) {
        const orderTotal = Number((order as Record<string, unknown>).total_amount) || 
                          Number((order as Record<string, unknown>).total) || 0;
        totalSales += orderTotal;
        
        // Count products from order items
        const items = (order as Record<string, unknown>).items;
        if (Array.isArray(items)) {
          for (const item of items) {
            productCount += Number((item as Record<string, unknown>).quantity) || 1;
          }
        } else {
          productCount += 1; // At least 1 product per order
        }
      }
      
      const orderCount = result.items.length;
      const avgOrderValue = orderCount > 0 ? Math.round(totalSales / orderCount) : 0;
      
      // Add summary fields
      output.report_date = dateStr;
      output.total_sales = totalSales.toLocaleString('en-IN');
      output.order_count = orderCount;
      output.product_count = productCount;
      output.avg_order_value = avgOrderValue.toLocaleString('en-IN');
      
      console.log(`[pb.find] Sales summary: ₹${totalSales} from ${orderCount} orders, ${productCount} products`);
    } else if (collection === 'orders') {
      // No orders - add empty summary
      const today = new Date();
      output.report_date = today.toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      });
      output.total_sales = '0';
      output.order_count = 0;
      output.product_count = 0;
      output.avg_order_value = '0';
    }

    return { output };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[pb.find] Error querying ${collection}:`, errorMessage);
    return {
      output: {
        items: [],
        totalItems: 0,
        error: errorMessage,
      },
    };
  }
}

/**
 * Execute report.sales node
 * Computes a sales summary over a date range from the orders collection.
 */
async function executeSalesReport(
  node: FlowNode,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  const config = (node.data?.config as Record<string, unknown>) || {};

  const period = (config.period as string) || 'today';
  const statusFilter = (config.statusFilter as string) || 'paid';
  const customFilter = (config.customFilter as string) || '';

  const now = new Date();
  let from: Date;
  let to: Date;
  let reportLabel: string;

  switch (period) {
    case 'yesterday': {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      from = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
      to = todayStart;
      reportLabel = from.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      break;
    }
    case 'last7d': {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      from = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
      to = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
      reportLabel = 'Last 7 days';
      break;
    }
    case 'today':
    default: {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      from = todayStart;
      to = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
      reportLabel = todayStart.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      break;
    }
  }

  // Build base filter
  const filterParts: string[] = [];

  if (statusFilter === 'paid') {
    filterParts.push('payment_status="paid"');
  } else if (statusFilter === 'all') {
    filterParts.push('id != ""');
  } else if (statusFilter === 'custom' && customFilter.trim().length > 0) {
    filterParts.push(customFilter.trim());
  } else {
    // Fallback: all orders
    filterParts.push('id != ""');
  }

  // Date range filter
  const fromIso = from.toISOString();
  const toIso = to.toISOString();
  filterParts.push(`created >= "${fromIso}" && created < "${toIso}"`);

  const filter = filterParts.join(' && ');

  console.log(`[report.sales] Querying orders with filter: ${filter}`);

  try {
    const result = await pb.collection('orders').getList(1, 500, {
      filter,
      sort: '-created',
    });

    const output: Record<string, unknown> = {
      items: result.items,
      totalItems: result.totalItems,
    };

    if (result.items.length > 0) {
      let totalSales = 0;
      let productCount = 0;

      for (const order of result.items) {
        const rec = order as Record<string, unknown>;
        const orderTotal =
          Number(rec.total_amount as number | string) ||
          Number(rec.total as number | string) ||
          0;
        totalSales += orderTotal;

        const items = rec.items as unknown;
        if (Array.isArray(items)) {
          for (const item of items as Array<Record<string, unknown>>) {
            productCount += Number(item.quantity as number | string) || 1;
          }
        } else {
          productCount += 1;
        }
      }

      const orderCount = result.items.length;
      const avgOrderValue = orderCount > 0 ? Math.round(totalSales / orderCount) : 0;

      output.report_date = reportLabel;
      output.total_sales = totalSales.toLocaleString('en-IN');
      output.order_count = orderCount;
      output.product_count = productCount;
      output.avg_order_value = avgOrderValue.toLocaleString('en-IN');

      console.log(
        `[report.sales] Summary for ${reportLabel}: ₹${totalSales} from ${orderCount} orders, ${productCount} products`,
      );
    } else {
      output.report_date = reportLabel;
      output.total_sales = '0';
      output.order_count = 0;
      output.product_count = 0;
      output.avg_order_value = '0';

      console.log(`[report.sales] No orders found for ${reportLabel}`);
    }

    return {
      output: {
        ...context.input,
        ...output,
      },
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[report.sales] Error building report:', errorMessage);
    return {
      output: {
        ...context.input,
        error: errorMessage,
      },
    };
  }
}

/**
 * Execute logic.if node
 */
async function executeLogicIf(
  node: FlowNode,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  const config = node.data?.config as Record<string, any> || {};
  const condition = config.condition as string;

  if (!condition) {
    throw new Error('logic.if: condition is required');
  }

  console.log(`[logic.if] Evaluating: ${condition}`);

  try {
    // Create safe evaluation function
    // WARNING: This uses Function constructor - only safe because flows are admin-created
    const evalFn = new Function('input', 'vars', `return (${condition});`);
    const result = evalFn(context.input, context.vars);
    const isTrue = Boolean(result);

    console.log(`[logic.if] Result: ${isTrue}`);

    return {
      output: {
        ...context.input, // Forward all input data
        _condition: condition,
        _result: isTrue,
      },
      nextHandle: isTrue ? 'true' : 'false',
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[logic.if] Error evaluating condition:`, errorMessage);
    throw new Error(`Failed to evaluate condition: ${errorMessage}`);
  }
}

/**
 * Execute util.delay node
 */
async function executeUtilDelay(
  node: FlowNode,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  const config = node.data?.config as Record<string, any> || {};
  
  const amount = Number(config.amount) || 0;
  const unit = (config.unit as string) || 'seconds';

  let delayMs = 0;
  switch (unit) {
    case 'seconds':
      delayMs = amount * 1000;
      break;
    case 'minutes':
      delayMs = amount * 60 * 1000;
      break;
    case 'hours':
      delayMs = amount * 60 * 60 * 1000;
      break;
  }

  console.log(`[util.delay] Waiting ${amount} ${unit} (${delayMs}ms)`);

  await new Promise(resolve => setTimeout(resolve, delayMs));

  return {
    output: context.input, // Pass through
  };
}

/**
 * Execute whatsapp.send node
 */
async function executeWhatsAppSend(
  node: FlowNode,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  const config = node.data?.config as Record<string, any> || {};
  
  const toPath = (config.toPath as string) || 'input.phone';
  const template = (config.template as string) || '';
  const connectionId = config.connectionId as string;
  const instanceId = (config.sender as string) || 'zenthra'; // Evolution Instance ID from config
  const delayMs = (config.delayMs as number) || 250;
  const presence = (config.presence as string) || 'composing';
  const linkPreview = config.linkPreview !== false; // Default true

  // Get phone number - either from context path OR use directly if it's a phone number
  let phone: string | undefined;
  
  // Check if toPath looks like a phone number (starts with digits)
  if (/^\d+$/.test(toPath)) {
    // It's a direct phone number, use it as-is
    phone = toPath;
    console.log(`[whatsapp.send] Using direct phone number: ${phone}`);
  } else {
    // It's a path, resolve from context
    phone = getByPath(context, toPath);
    console.log(`[whatsapp.send] Resolved phone from path "${toPath}": ${phone}`);
  }
  
  if (!phone) {
    throw new Error(`whatsapp.send: Could not resolve phone from path "${toPath}"`);
  }

  // Substitute variables in template
  const message = substituteVariables(template, context);

  console.log(`[whatsapp.send] Sending to ${phone}: ${message.substring(0, 50)}...`);
  console.log(`[whatsapp.send] Using instanceId: ${instanceId}`);

  try {
    // Get Evolution API config from plugins collection
    let evolutionConfig: any;
    
    try {
      console.log(`[whatsapp.send] Fetching plugin config for: ${connectionId}`);
      const pluginRecord = await pb.collection('plugins').getFirstListItem(`key="${connectionId}"`, {
        $autoCancel: false,
      });
      evolutionConfig = pluginRecord.config;
      console.log(`[whatsapp.send] Plugin config loaded successfully`);
    } catch (error) {
      console.error('[whatsapp.send] Error fetching Evolution config:', error);
      throw new Error('Evolution API not configured in Plugins Manager');
    }

    if (!evolutionConfig?.baseUrl || !evolutionConfig?.tokenOrKey) {
      throw new Error('Evolution API baseUrl or tokenOrKey not configured');
    }
    
    // Use instanceId from node config, or fall back to plugin config
    const finalInstanceId = instanceId || evolutionConfig.defaultSender || 'zenthra';
    const apiKey = evolutionConfig.tokenOrKey;

    console.log(`[whatsapp.send] Evolution API: ${evolutionConfig.baseUrl}, Instance: ${finalInstanceId}`);

    // Send directly to Evolution API
    const url = `${evolutionConfig.baseUrl.replace(/\/$/, '')}/message/sendText/${finalInstanceId}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({
        number: String(phone).replace(/\D/g, ''),
        text: message,
        options: {
          delay: delayMs,
          presence: presence,
          linkPreview: linkPreview,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `Evolution API error: ${response.status}`);
    }

    const result = await response.json();
    console.log(`[whatsapp.send] Message sent successfully:`, result);

    // Log to whatsapp_activity for deduplication
    try {
      await pb.collection('whatsapp_activity').create({
        recipient: String(phone),
        template_name: 'ABANDONED_CART',
        message_text: message,
        status: 'sent',
      });
    } catch (logError) {
      console.warn('[whatsapp.send] Failed to log activity:', logError);
    }

    return {
      output: {
        phone,
        message,
        sent: true,
        result,
      },
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[whatsapp.send] Error sending message:`, errorMessage);
    throw new Error(`Failed to send WhatsApp: ${errorMessage}`);
  }
}

// ============================================================================
// CORE EXECUTOR
// ============================================================================

/**
 * Execute a single node
 */
async function executeNode(
  node: FlowNode,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  const nodeType = node.data?.type as string;
  
  console.log(`[executor] Executing node ${node.id} (${nodeType})`);

  switch (nodeType) {
    case 'trigger.journey':
      return await executeTriggerJourney(node, context);
    case 'trigger.cron':
      return await executeTriggerCron(node, context);
    case 'pb.find':
      return await executePbFind(node, context);
    case 'report.sales':
      return await executeSalesReport(node, context);
    case 'logic.if':
      return await executeLogicIf(node, context);
    case 'util.delay':
      return await executeUtilDelay(node, context);
    case 'whatsapp.send':
      return await executeWhatsAppSend(node, context);
    default:
      console.warn(`[executor] Unsupported node type: ${nodeType}`);
      return {
        output: context.input, // Pass through
      };
  }
}

/**
 * Find the next node to execute based on edges
 */
function findNextNode(
  currentNodeId: string,
  edges: FlowEdge[],
  handle?: string
): string | null {
  // Find edge from current node
  let targetEdge = edges.find(
    edge => edge.source === currentNodeId && (!handle || edge.sourceHandle === handle)
  );

  // Fallback: if no edge with specific handle, try default edge
  if (!targetEdge && handle) {
    targetEdge = edges.find(edge => edge.source === currentNodeId && !edge.sourceHandle);
  }

  return targetEdge?.target || null;
}

/**
 * Execute a flow run
 */
export async function executeFlowRun(
  runId: string,
  flow: FlowSummary,
  inputEvent: Record<string, any>
): Promise<void> {
  console.log(`[engine] Starting execution of run ${runId} for flow ${flow.id}`);

  try {
    // Mark run as running
    await pb.collection('runs').update(runId, {
      status: 'running',
    });

    const canvas = flow.canvasJson;
    const nodes = canvas.nodes;
    const edges = canvas.edges;

    // Build node lookup
    const nodesById = new Map<string, FlowNode>();
    for (const node of nodes) {
      nodesById.set(node.id, node);
    }

    // Find trigger node
    const triggerNode = nodes.find(node => {
      const nodeType = node.data?.type as string;
      return nodeType?.startsWith('trigger.');
    });

    if (!triggerNode) {
      throw new Error('No trigger node found in flow');
    }

    // Initialize execution context
    const context: ExecutionContext = {
      input: inputEvent,
      event: inputEvent, // Preserve original event data
      vars: {},
      metadata: {
        flowId: flow.id,
        runId,
      },
    };

    // Start execution from trigger
    let currentNodeId: string | null = triggerNode.id;
    let stepCount = 0;
    const maxSteps = 100; // Prevent infinite loops

    while (currentNodeId && stepCount < maxSteps) {
      const currentNode = nodesById.get(currentNodeId);
      if (!currentNode) {
        throw new Error(`Node ${currentNodeId} not found`);
      }

      stepCount++;
      const stepStartTime = new Date().toISOString();

      // Create run step record
      const stepRecord = await pb.collection('run_steps').create({
        run_id: runId,
        node_id: currentNode.id,
        node_type: currentNode.data?.type || 'unknown',
        status: 'running',
        started_at: stepStartTime,
        input: context.input,
      });

      try {
        // Execute node
        const result = await executeNode(currentNode, context);

        // Update step as success
        await pb.collection('run_steps').update(stepRecord.id, {
          status: 'success',
          finished_at: new Date().toISOString(),
          output: result.output,
        });

        // Update context with output
        context.input = result.output;

        // Find next node
        currentNodeId = findNextNode(currentNode.id, edges, result.nextHandle);

      } catch (error: any) {
        // Update step as failed
        await pb.collection('run_steps').update(stepRecord.id, {
          status: 'failed',
          finished_at: new Date().toISOString(),
          error: error.message,
        });

        throw error; // Propagate to fail the run
      }
    }

    if (stepCount >= maxSteps) {
      throw new Error('Flow execution exceeded maximum steps (possible infinite loop)');
    }

    // Mark run as success
    await pb.collection('runs').update(runId, {
      status: 'success',
      finished_at: new Date().toISOString(),
    });

    console.log(`[engine] Run ${runId} completed successfully`);

  } catch (error: any) {
    console.error(`[engine] Run ${runId} failed:`, error.message);

    // Mark run as failed
    await pb.collection('runs').update(runId, {
      status: 'failed',
      finished_at: new Date().toISOString(),
      error: error.message,
    });
  }
}

/**
 * Start flow run from customer journey event
 */
export async function startRunFromJourneyEvent(
  eventPayload: Record<string, any>
): Promise<void> {
  console.log(`[engine] Processing journey event:`, eventPayload);

  try {
    // Find active flows with trigger.journey
    const flows = await pb.collection('flows').getFullList({
      filter: 'status = "active"',
    });

    console.log(`[engine] Found ${flows.length} active flows`);

    for (const flow of flows) {
      // Parse canvasJson if it's a string (PocketBase might store it as JSON string)
      let canvas: FlowCanvas;
      try {
        const rawCanvas = (flow as any).canvas_json || (flow as any).canvasJson;
        if (!rawCanvas) {
          console.warn(`[engine] Flow ${flow.id} has no canvasJson, skipping`);
          continue;
        }
        
        canvas = typeof rawCanvas === 'string' ? JSON.parse(rawCanvas) : rawCanvas;
        
        if (!canvas.nodes || !Array.isArray(canvas.nodes)) {
          console.warn(`[engine] Flow ${flow.id} has invalid canvas structure, skipping`);
          continue;
        }
      } catch (parseError) {
        console.error(`[engine] Failed to parse canvas for flow ${flow.id}:`, parseError);
        continue;
      }

      const triggerNode = canvas.nodes.find(node => {
        const nodeType = node.data?.type as string;
        return nodeType === 'trigger.journey';
      });

      if (!triggerNode) {
        console.log(`[engine] Flow ${flow.id} has no trigger.journey node, skipping`);
        continue;
      }

      const triggerConfig = triggerNode.data?.config as Record<string, any> || {};
      const eventType = triggerConfig.eventType as string;

      // Check if this flow should be triggered
      const shouldTrigger =
        eventType === 'any' ||
        eventType === eventPayload.event ||
        (eventType === 'cart_abandon' && eventPayload.event === 'stage_entered'); // Temporary compatibility

      if (!shouldTrigger) {
        console.log(`[engine] Flow ${flow.id} not triggered (eventType mismatch)`);
        continue;
      }

      console.log(`[engine] Starting run for flow ${flow.id}`);

      // Create run record
      const run = await pb.collection('runs').create({
        flow_id: flow.id,
        trigger_type: 'customer_journey',
        status: 'queued',
        test_mode: false,
        started_at: new Date().toISOString(),
        input_event: eventPayload,
      });

      // Map flow to FlowSummary structure for executor
      const flowSummary: FlowSummary = {
        id: flow.id,
        name: (flow as any).name || 'Unnamed Flow',
        description: (flow as any).description,
        status: (flow as any).status || 'active',
        version: (flow as any).version || 1,
        createdAt: (flow as any).created || new Date().toISOString(),
        updatedAt: (flow as any).updated || new Date().toISOString(),
        canvasJson: canvas,
      };

      // Execute flow in background (don't await to prevent blocking)
      executeFlowRun(run.id, flowSummary, eventPayload).catch(error => {
        console.error(`[engine] Background execution failed for run ${run.id}:`, error);
      });
    }
  } catch (error: any) {
    console.error(`[engine] Error processing journey event:`, error.message);
  }
}

// ============================================================================
// CRON SCHEDULER (OPTIMIZED)
// ============================================================================

// Interval schedule mapping
const INTERVAL_SCHEDULES: Record<string, string> = {
  '5m': '*/5 * * * *',
  '15m': '*/15 * * * *',
  '30m': '*/30 * * * *',
  '1h': '0 * * * *',
  '2h': '0 */2 * * *',
  '4h': '0 */4 * * *',
  '6h': '0 */6 * * *',
  '12h': '0 */12 * * *',
};

// Weekday mapping for cron (0 = Sunday, 1 = Monday, etc.)
const WEEKDAY_CRON: Record<string, string> = {
  'everyday': '*',
  'weekdays': '1-5',
  'weekends': '0,6',
  'mon': '1',
  'tue': '2',
  'wed': '3',
  'thu': '4',
  'fri': '5',
  'sat': '6',
  'sun': '0',
};

/**
 * Build cron expression from schedule config
 */
function buildCronExpression(config: Record<string, unknown>): string {
  const scheduleType = (config.scheduleType as string) || 'daily';
  
  // If custom cron is provided and scheduleType is custom, use it
  if (scheduleType === 'custom' && config.cron) {
    return config.cron as string;
  }
  
  // Legacy support: if 'schedule' key exists (old format)
  if (config.schedule && !config.scheduleType) {
    const legacySchedules: Record<string, string> = {
      '5m': '*/5 * * * *',
      '15m': '*/15 * * * *',
      '1h': '0 * * * *',
      '6h': '0 */6 * * *',
      '1d': '0 9 * * *',
    };
    return legacySchedules[config.schedule as string] || '';
  }
  
  switch (scheduleType) {
    case 'interval': {
      const interval = (config.interval as string) || '1h';
      return INTERVAL_SCHEDULES[interval] || '0 * * * *';
    }
    
    case 'daily': {
      const time = (config.time as string) || '09:00';
      const [hour, minute] = time.split(':').map(Number);
      return `${minute || 0} ${hour || 9} * * *`;
    }
    
    case 'weekly': {
      const time = (config.time as string) || '09:00';
      const [hour, minute] = time.split(':').map(Number);
      const weekdays = (config.weekdays as string) || 'weekdays';
      const dayOfWeek = WEEKDAY_CRON[weekdays] || '*';
      return `${minute || 0} ${hour || 9} * * ${dayOfWeek}`;
    }
    
    case 'custom': {
      return (config.cron as string) || '0 9 * * *';
    }
    
    default:
      return '0 9 * * *'; // Default: 9 AM daily
  }
}

// Track last run times to prevent duplicate runs within the same minute
const lastCronRuns: Map<string, number> = new Map();

// Cache for cron flows - refreshed every 5 minutes to reduce DB queries
interface CronFlowCache {
  flows: Array<{
    id: string;
    name: string;
    canvas: FlowCanvas;
    cronNodes: Array<{ nodeId: string; cron: string }>;
  }>;
  lastRefresh: number;
}

let cronFlowCache: CronFlowCache = { flows: [], lastRefresh: 0 };
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Check if a cron expression matches the current time
 */
function cronMatchesNow(cronExpression: string): boolean {
  const now = new Date();
  const parts = cronExpression.split(' ');
  
  if (parts.length !== 5) return false;
  
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  
  const matchPart = (part: string, value: number): boolean => {
    if (part === '*') return true;
    
    // Handle */n (every n)
    if (part.startsWith('*/')) {
      const interval = parseInt(part.substring(2), 10);
      return value % interval === 0;
    }
    
    // Handle comma-separated values
    if (part.includes(',')) {
      return part.split(',').map(Number).includes(value);
    }
    
    // Handle range (e.g., 1-5)
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      return value >= start && value <= end;
    }
    
    // Direct match
    return parseInt(part, 10) === value;
  };
  
  return (
    matchPart(minute, now.getMinutes()) &&
    matchPart(hour, now.getHours()) &&
    matchPart(dayOfMonth, now.getDate()) &&
    matchPart(month, now.getMonth() + 1) &&
    matchPart(dayOfWeek, now.getDay())
  );
}

/**
 * Refresh the cron flow cache from database
 */
async function refreshCronFlowCache(): Promise<void> {
  try {
    const flows = await pb.collection('flows').getFullList({
      filter: 'status = "active"',
    });

    const cronFlows: CronFlowCache['flows'] = [];

    for (const flow of flows) {
      let canvas: FlowCanvas;
      try {
        const rawCanvas = (flow as any).canvas_json || (flow as any).canvasJson;
        if (!rawCanvas) continue;
        canvas = typeof rawCanvas === 'string' ? JSON.parse(rawCanvas) : rawCanvas;
        if (!canvas.nodes || !Array.isArray(canvas.nodes)) continue;
      } catch {
        continue;
      }

      // Find cron trigger nodes
      const cronNodes: Array<{ nodeId: string; cron: string }> = [];
      
      for (const node of canvas.nodes) {
        if ((node.data?.type as string) !== 'trigger.cron') continue;
        
        const config = node.data?.config as Record<string, unknown> || {};
        
        // Build cron expression from config (handles all schedule types)
        const cronExpression = buildCronExpression(config);
        
        if (cronExpression) {
          cronNodes.push({ nodeId: node.id, cron: cronExpression });
        }
      }

      if (cronNodes.length > 0) {
        cronFlows.push({
          id: flow.id,
          name: (flow as any).name || 'Unnamed Flow',
          canvas,
          cronNodes,
        });
      }
    }

    cronFlowCache = { flows: cronFlows, lastRefresh: Date.now() };
    
    if (cronFlows.length > 0) {
      console.log(`[cron] Cache refreshed: ${cronFlows.length} cron flow(s) found`);
    }
  } catch (error: any) {
    console.error(`[cron] Failed to refresh cache:`, error.message);
  }
}

/**
 * Force refresh the cron cache (call when flows are updated)
 */
export function invalidateCronCache(): void {
  cronFlowCache.lastRefresh = 0;
}

/**
 * Start flow runs from cron triggers
 * Called every minute by the scheduler - OPTIMIZED version
 */
export async function startRunFromCron(): Promise<void> {
  const now = Date.now();
  const currentMinute = Math.floor(now / 60000); // Minute-level timestamp
  
  // Refresh cache if stale (every 5 minutes) or empty
  if (now - cronFlowCache.lastRefresh > CACHE_TTL || cronFlowCache.flows.length === 0) {
    await refreshCronFlowCache();
  }
  
  // Skip if no cron flows exist (no DB query, no logging)
  if (cronFlowCache.flows.length === 0) {
    return;
  }

  let triggeredCount = 0;

  for (const flow of cronFlowCache.flows) {
    for (const { nodeId, cron: cronExpression } of flow.cronNodes) {
      // Check if cron matches current time
      if (!cronMatchesNow(cronExpression)) {
        continue;
      }

      // Use minute-level key to prevent duplicates even after server restart
      const runKey = `${flow.id}:${nodeId}:${currentMinute}`;
      
      // Check in-memory first (fast path)
      if (lastCronRuns.has(runKey)) {
        continue; // Already ran this minute
      }
      
      // Check database for recent runs (handles server restarts)
      try {
        const fiveMinutesAgo = new Date(now - 5 * 60 * 1000).toISOString();
        const recentRuns = await pb.collection('runs').getList(1, 1, {
          filter: `flow_id = "${flow.id}" && trigger_type = "cron" && started_at >= "${fiveMinutesAgo}"`,
          sort: '-started_at',
          $autoCancel: false,
        });
        
        if (recentRuns.items.length > 0) {
          const lastRunTime = new Date(recentRuns.items[0].started_at).getTime();
          if (now - lastRunTime < 60000) {
            // Already ran within the last minute (from DB)
            lastCronRuns.set(runKey, now); // Cache it
            continue;
          }
        }
      } catch (dbError) {
        // If DB check fails, rely on in-memory check only
        console.warn(`[cron] DB check failed for flow ${flow.id}, using memory only`);
      }
      
      // Mark as run BEFORE executing to prevent race conditions
      lastCronRuns.set(runKey, now);
      
      // Clean up old entries (keep only last 100)
      if (lastCronRuns.size > 100) {
        const oldestKey = lastCronRuns.keys().next().value;
        if (oldestKey) lastCronRuns.delete(oldestKey);
      }

      console.log(`[cron] Triggering flow ${flow.id} (cron: ${cronExpression})`);

      try {
        // Create run record
        const run = await pb.collection('runs').create({
          flow_id: flow.id,
          trigger_type: 'cron',
          status: 'queued',
          test_mode: false,
          started_at: new Date().toISOString(),
          input_event: {
            trigger: 'cron',
            flowId: flow.id,
            nodeId,
            cron: cronExpression,
            triggered_at: new Date().toISOString(),
          },
        });

        // Map flow to FlowSummary structure
        const flowSummary: FlowSummary = {
          id: flow.id,
          name: flow.name,
          status: 'active',
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          canvasJson: flow.canvas,
        };

        // Execute flow in background
        executeFlowRun(run.id, flowSummary, {
          trigger: 'cron',
          flowId: flow.id,
          nodeId,
          cron: cronExpression,
          triggered_at: new Date().toISOString(),
        }).catch(error => {
          console.error(`[cron] Background execution failed for run ${run.id}:`, error);
        });

        triggeredCount++;
      } catch (error: any) {
        console.error(`[cron] Failed to create run for flow ${flow.id}:`, error.message);
      }
    }
  }

  if (triggeredCount > 0) {
    console.log(`[cron] Triggered ${triggeredCount} flow(s)`);
  }
}
