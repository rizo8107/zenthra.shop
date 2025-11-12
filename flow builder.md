Zenthra into an n8n-style automation system using xyflow (React Flow) on the frontend and PocketBase on the backend. Below is a full, ready-to-build blueprint with data models, node specs, sample code, and a Windsurf task plan. It covers abandoned cart detection, auto order confirmation, plugin actions, test events, and an execution list—all inside a visual builder.

1) Goals

Drag-and-drop Automation Builder (xyflow) with triggers, logic, and actions.

Persist flows in PocketBase; run them via a TypeScript worker.

Test Event runner, Execution List (runs, logs, step I/O).

Built-in nodes for: PocketBase Query/Watch, Cron, Webhook, Delay, Branch, Razorpay Verify, WhatsApp (Evolution API), Email (SMTP), HTTP, Map/Transform.

Example flows:

Abandoned Cart Recovery (timer + WhatsApp + email, with retry).

Auto Order Confirmation (on successful Razorpay payment).

2) High-level Architecture
[xyflow UI]  ──save/load──>  [PocketBase: flows, nodes, versions]
     │                             │
     ├── run test event ───────────┤
     │                             ▼
 [Flow Executor (Node/TS Worker)] <── [Triggers]
     │                                   ├─ Cron scheduler
     │                                   ├─ Webhook endpoint
     │                                   └─ PB Change feed (realtime)
     ▼
[Execution Log + Step Logs]  -> PocketBase (runs, steps, events)

3) PocketBase Collections (schema)

Use these collections (names in snake_case):

flows

id (text)

name (text)

status (enum: draft|active|archived)

version (int)

canvas_json (json) ← xyflow graph (nodes, edges)

created_by (relation users)

updated_at (auto)

flow_nodes (optional if you want node-level persistence; can be embedded in canvas_json)

flow_id (relation flows)

node_id (text)

type (text) ← e.g., trigger.cron, action.http

config (json)

position (json)

runs

id (text)

flow_id (relation flows)

trigger_type (text)

status (enum: queued|running|success|failed|canceled)

started_at (datetime)

finished_at (datetime)

error (text)

test_mode (bool)

input_event (json)

output (json)

run_steps

id

run_id (relation runs)

node_id (text)

node_type (text)

started_at (datetime)

finished_at (datetime)

status (enum)

input (json)

output (json)

error (text)

retries (int)

events (optional event store for replay)

id

name (text) ← e.g., cart.abandoned, order.paid

payload (json)

source (text) ← webhook|cron|pb

created_at (datetime)

correlation_id (text) ← tie to order/cart/user

connections (per-workspace credentials)

id

name (text) ← “Razorpay”, “EvolutionAPI”, “SMTP”

type (text) ← razorpay|evolution|smtp|http

config (json) ← keys, tokens, base URLs, template IDs

scoped_to_user (relation users) or workspace

RLS: only creator/team can read.

secrets (if you prefer separate)

key (unique)

value (encrypted by PocketBase rules)

indexes: add indexes on runs.flow_id, run_steps.run_id, events.name.

4) Node Type System (TypeScript)
// common
export type NodeIO = Record<string, any>;

export interface NodeContext {
  pb: any;                           // PocketBase SDK instance
  connections: Record<string, any>;  // hydrated credentials by id
  vars: Record<string, any>;         // flow variables
  logger: (msg: string, data?: any) => void;
  fetch: typeof globalThis.fetch;    // for http nodes
}

export interface RunStepResult {
  output?: NodeIO;
  status: 'success' | 'failed';
  retry?: { delayMs: number, max?: number };
  error?: string;
}

export interface NodeImpl {
  type: string; // 'trigger.cron', 'action.http', ...
  run: (config: any, input: NodeIO, ctx: NodeContext) => Promise<RunStepResult>;
  // for triggers:
  schedule?:(config:any, cb:(event:NodeIO)=>Promise<void>)=>Promise<void>;
}

Core Nodes

Triggers

trigger.cron → { cron: "*/5 * * * *" }

trigger.webhook → { path: "/hooks/order-paid", secret: "…" }

trigger.pbChange → { collection: "orders", filter: "status='paid'" }

Logic

logic.if → { condition: "input.total >= 499" }

logic.switch → { expr: "input.status", cases: { paid: '…', cod: '…' } }

logic.map → transform JSON with JSONata or handlebars.

Actions

action.http → generic HTTP call

action.email → SMTP config + template

action.whatsapp → Evolution API send template

action.razorpay.verify → verify signature/status

action.pb.query → read/write PocketBase

action.delay → { ms: 600000 }

action.retry → per-node retry policy (also supported automatically)

action.log → persist debug info

5) Minimal Flow Model (xyflow)

nodes[]: { id, type, position, data: { label, config, connectionId, mapping } }

edges[]: { id, source, target, sourceHandle?, targetHandle?, data? }

Example canvas_json (Abandoned Cart):

{
  "nodes": [
    { "id": "t1", "type": "trigger.cron", "position": { "x": 80, "y": 80 },
      "data": { "label": "Every 30 min", "config": { "cron": "*/30 * * * *" } } },
    { "id": "q1", "type": "action.pb.query", "position": { "x": 320, "y": 80 },
      "data": {
        "label": "Find Abandoned Carts",
        "config": {
          "collection": "carts",
          "filter": "updatedAt < @now-30m && status='open' && itemsCount>0",
          "expand": ["user"]
        }
      }
    },
    { "id": "if1", "type": "logic.if", "position": { "x": 580, "y": 80 },
      "data": { "label": "If has phone", "config": { "condition": "Array.isArray(input) && input.length>0" } } },
    { "id": "wa1", "type": "action.whatsapp", "position": { "x": 820, "y": 20 },
      "data": { "label": "WA reminder", "config": { "template": "cart_reminder_1" }, "connectionId": "evolution_1" } },
    { "id": "em1", "type": "action.email", "position": { "x": 820, "y": 140 },
      "data": { "label": "Email reminder", "config": { "templateId": "cart_email_1" }, "connectionId": "smtp_1" } },
    { "id": "dl1", "type": "action.delay", "position": { "x": 1080, "y": 20 },
      "data": { "label": "Delay 6h", "config": { "ms": 21600000 } } },
    { "id": "wa2", "type": "action.whatsapp", "position": { "x": 1300, "y": 20 },
      "data": { "label": "WA 2nd nudge", "config": { "template": "cart_reminder_2" }, "connectionId": "evolution_1" } }
  ],
  "edges": [
    { "id": "e1", "source": "t1", "target": "q1" },
    { "id": "e2", "source": "q1", "target": "if1" },
    { "id": "e3", "source": "if1", "target": "wa1", "data": { "when": "true" } },
    { "id": "e4", "source": "if1", "target": "em1", "data": { "when": "false" } },
    { "id": "e5", "source": "wa1", "target": "dl1" },
    { "id": "e6", "source": "dl1", "target": "wa2" }
  ]
}

6) Execution Worker (TS) — skeleton
// worker.ts
import PocketBase from 'pocketbase';
import cron from 'node-cron';
import { createHash, randomUUID } from 'crypto';

const pb = new PocketBase(process.env.PB_URL);
await pb.admins.authWithPassword(process.env.PB_EMAIL!, process.env.PB_PASS!);

// --- Node registry
const registry: Record<string, NodeImpl> = {
  'trigger.cron': { type: 'trigger.cron',
    schedule: async (cfg, cb) => {
      cron.schedule(cfg.cron, () => cb({ time: new Date().toISOString() }));
    },
    run: async () => ({ status: 'success' }) // no-op
  },
  'action.pb.query': {
    type: 'action.pb.query',
    run: async (cfg, input, ctx) => {
      const res = await ctx.pb.collection(cfg.collection).getList(1, 200, { filter: cfg.filter, expand: cfg.expand?.join(',') });
      return { status: 'success', output: res.items };
    }
  },
  'action.whatsapp': {
    type: 'action.whatsapp',
    run: async (cfg, input, ctx) => {
      // send via Evolution API
      const { baseUrl, token, phoneField = 'user.phone' } = ctx.connections[cfg.connectionId];
      const to = eval(`(i)=>i.${phoneField}`)(Array.isArray(input)?input[0]:input);
      const resp = await ctx.fetch(`${baseUrl}/message`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, template: cfg.template, data: input })
      });
      if (!resp.ok) return { status: 'failed', error: await resp.text(), retry: { delayMs: 60000 } };
      return { status: 'success', output: await resp.json() };
    }
  },
  'action.delay': {
    type: 'action.delay',
    run: async (cfg) => {
      await new Promise(r => setTimeout(r, cfg.ms));
      return { status: 'success' };
    }
  },
  // … add email/http/if/razorpay.verify
};

// --- Executor
async function runFlow(flowId: string, event: any, testMode=false) {
  const flow = await pb.collection('flows').getOne(flowId);
  const run = await pb.collection('runs').create({
    flow_id: flow.id, status: 'running', input_event: event, test_mode: testMode, started_at: new Date().toISOString()
  });

  const ctx: NodeContext = {
    pb,
    connections: await hydrateConnections(), // fetch & decrypt
    vars: {},
    logger: (m,d)=>pb.collection('run_steps').create({ run_id: run.id, node_id:'log', node_type:'log', status:'success', input:{msg:m,data:d} }),
    fetch: globalThis.fetch
  };

  const graph = flow.canvas_json;
  const nodeById = Object.fromEntries(graph.nodes.map((n:any)=>[n.id,n]));
  // naïve DFS execution:
  let current = graph.nodes.find((n:any)=>n.type.startsWith('trigger.'));
  let input:any = event;
  while(current) {
    const impl = registry[current.type];
    const start = Date.now();
    const step = await pb.collection('run_steps').create({ run_id: run.id, node_id: current.id, node_type: current.type, started_at: new Date().toISOString(), status:'running', input });
    const res = await impl.run(current.data.config, input, ctx).catch((e)=>({ status:'failed', error:String(e) }));
    await pb.collection('run_steps').update(step.id, { finished_at: new Date().toISOString(), status: res.status, output: res.output, error: res.error });
    if (res.status !== 'success') throw new Error(res.error || 'step failed');

    input = res.output;
    const edge = graph.edges.find((e:any)=>e.source === current.id); // simple linear example
    current = edge ? nodeById[edge.target] : null;
  }

  await pb.collection('runs').update(run.id, { status:'success', output: input, finished_at: new Date().toISOString() });
}

// --- Schedulers: wire cron triggers for all active flows
async function boot() {
  const active = await pb.collection('flows').getFullList({ filter: 'status="active"' });
  for (const flow of active) {
    const graph = flow.canvas_json;
    for (const n of graph.nodes) {
      if (n.type === 'trigger.cron') {
        registry[n.type].schedule!(n.data.config, (event)=>runFlow(flow.id, event, false));
      }
    }
  }
}
boot();


(This is a minimal executor to get you running; expand to support branching, parallelism, retry queues, and per-edge conditions.)

7) Webhooks & Payment Confirmation

Public endpoint (behind your API gateway):

POST /hooks/order/razorpay

Validate X-Razorpay-Signature

Create events record with name order.paid

Enqueue runFlow(flowId, event)

Trigger node config for webhook:

{ "path": "/hooks/order/razorpay", "secret": "…", "forward_payload": true }


Order Confirmation Flow:

Trigger: trigger.webhook (payload from Razorpay)

Node: action.razorpay.verify

Node: action.pb.query (update order status → paid)

Node: action.whatsapp (template: order_confirmed)

Node: action.email (order invoice)

8) xyflow UI (React) — structure

Canvas

<ReactFlow> + MiniMap + Controls + Background

Node types: Trigger, Logic, Action (different rounded styles)

Edge with labels (conditions)

Right Config Panel

Form for node config (zod + react-hook-form)

Connection picker (from connections collection)

Inline Test Node button to run with mock input

Footer

“Run Test Event” button → choose flow + paste JSON → shows Execution Drawer with live step logs from run_steps.

Execution List Page

Table (runs): status pill, trigger, duration, started at, test vs live

Click → timeline of steps with input/output JSON (collapsible), retries

9) Abandoned Cart Logic (PocketBase side)

carts collection fields: user_id, items_count, updatedAt, status (open|converted)

Flow checks carts where updatedAt < now - 30m and status='open' and items_count>0.

On send reminder, write a record to events with correlation id = cart id.

If order placed later, mark cart status='converted' (second flow or webhook from checkout).

Rate-limit per user: keep cart_reminders collection to avoid duplicates within 24h.

10) Testing & QA

Test Event fixtures:

cart.abandoned with sample user, phone, items.

order.paid Razorpay payload (sanitized).

Run flows in test_mode → routes messages to your test WhatsApp number / sandbox SMTP.

Seed flows via PocketBase scripts; export/import flows as JSON.

11) Security

PocketBase RLS: Only owners can read/write their flows, runs, connections.

Encrypt connections.config (at rest) or store in external secret manager.

Webhook secret verification.

Executor runs on server with IP allowlist for Razorpay/Evolution.

12) “Windsurf” Task Plan (copy-paste checklist)

Epic: Automation Builder (xyflow + PocketBase + Worker)

Data Layer

 Create collections: flows, runs, run_steps, events, connections.

 RLS rules and indexes.

 Connection hydrator util (decrypt + cache).

Node Registry

 Implement trigger.cron, trigger.webhook, trigger.pbChange.

 Implement actions: pb.query, http, email.smtp, whatsapp.evolution, razorpay.verify, delay, log.

 Implement logic: if, switch, map.

Executor

 Core DFS engine with per-node retries + backoff.

 Queue: in-memory now; Redis/SQLite later for parallelism.

 Persist runs and run_steps.

 Boot scheduler for active flows.

xyflow UI

 Node cards (3 variants), edge labels.

 Right inspector with zod forms per node.

 Toolbar: zoom, auto-layout, validate graph.

 “Test Event” modal → start run (test_mode).

 Save/Load to PocketBase.

Execution List

 Runs table with filters.

 Run details drawer: step timeline, input/output JSON, retries.

 Re-run with same input (for idempotency tests).

Flows

 Abandoned Cart Recovery (cron → query → if → WA/email → delay → WA2).

 Auto Order Confirmation (webhook → verify → update order → WA/email).

 Add template library (export/import JSON).

DevOps

 .env for PB, Evolution API, SMTP, Razorpay.

 Docker compose for worker.

 Health endpoints and logs.

Bonus: Example UI Node Component (xyflow)
// NodeCard.tsx
import { Handle, Position } from '@xyflow/react';
export function NodeCard({ data, selected }: any) {
  return (
    <div className={`rounded-2xl border p-3 w-64 ${selected?'ring-2 ring-violet-400':'border-slate-200'} bg-white/80 backdrop-blur`}>
      <div className="text-xs font-medium text-slate-500">{data.kind}</div>
      <div className="text-sm font-semibold">{data.label}</div>
      {data.preview && <div className="mt-2 text-xs text-slate-500">{data.preview}</div>}
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
