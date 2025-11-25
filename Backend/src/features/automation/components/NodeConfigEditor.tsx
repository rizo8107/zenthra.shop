import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Play, AlertCircle, CheckCircle2, Settings, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getNodeDefinition, type NodeDefinition, type NodeConfigField } from '../nodes/nodeDefinitions';
import { pb, ensureAdminAuth } from '@/lib/pocketbase';

const pluginConfigCache: Record<string, Record<string, unknown>> = {};

interface NodeConfigEditorProps {
  nodeId: string;
  nodeType: string;
  config: Record<string, unknown>;
  onConfigChange: (nodeId: string, config: Record<string, unknown>) => void;
  onDeleteNode: (nodeId: string) => void;
}

export function NodeConfigEditor({
  nodeId,
  nodeType,
  config,
  onConfigChange,
  onDeleteNode
}: NodeConfigEditorProps) {
  const [localConfig, setLocalConfig] = useState<Record<string, unknown>>(config);
  const [qbConditions, setQbConditions] = useState<Array<{ field: string; operator: string; value?: string; value2?: string }>>(
    (config.conditions as Array<{ field: string; operator: string; value?: string; value2?: string }>) || []
  );
  const [qbLogic, setQbLogic] = useState<'AND' | 'OR'>(((config.logic as string) === 'OR' ? 'OR' : 'AND'));
  // Sort builder state (must be before any early returns)
  type SortRow = { field: string; dir: 'asc' | 'desc' };
  const parseSort = (s: string): SortRow[] => {
    if (!s) return [];
    return s
      .split(',')
      .map(x => x.trim())
      .filter(Boolean)
      .map(token => {
        if (token.startsWith('-')) return { field: token.slice(1), dir: 'desc' as const };
        if (token.startsWith('+')) return { field: token.slice(1), dir: 'asc' as const };
        return { field: token, dir: 'asc' as const };
      });
  };
  const stringifySort = (rows: SortRow[]) => rows
    .filter(r => r.field)
    .map(r => (r.dir === 'desc' ? `-${r.field}` : `+${r.field}`))
    .join(',');
  const [sortRows, setSortRows] = useState<SortRow[]>(parseSort(String(config.sort || '')));
  useEffect(() => {
    setSortRows(parseSort(String(config.sort || '')));
  }, [config.sort]);
  const defaultTestInput =
    nodeType === 'whatsapp.send'
      ? JSON.stringify(
          {
            customer_name: 'John Doe',
            customer_email: 'john@example.com',
            phone: '919876543210',
            event: 'add_to_cart',
            stage: 'consideration',
            metadata: {
              title: 'Viruthvi Gold',
              url: 'https://yourstore.com/checkout',
              event_type: 'page_view',
              total: 15000,
              order_id: 'ORD123',
            },
          },
          null,
          2
        )
      : '{"test": true}';
  const [testInput, setTestInput] = useState<string>(defaultTestInput);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    output?: unknown;
    error?: string;
    timestamp: Date;
  } | null>(null);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();
  const nodeDefinition = getNodeDefinition(nodeType);
  const CRON_SCHEDULES: Record<string, string> = {
    '5m': '*/5 * * * *',
    '15m': '*/15 * * * *',
    '1h': '0 * * * *',
    '6h': '0 */6 * * *',
    '1d': '0 9 * * *',
  };
  const [webhookOptions, setWebhookOptions] = useState<Array<{ value: string; label: string; detail?: string }>>([]);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookError, setWebhookError] = useState<string | null>(null);

  const fetchPluginConfig = async (key: 'whatsapp_api' | 'evolution_api') => {
    if (pluginConfigCache[key]) return pluginConfigCache[key];
    try {
      await ensureAdminAuth();
    } catch (error) {
      console.warn('PocketBase admin auth not confirmed for plugin config fetch:', error);
    }
    try {
      const record = await pb.collection('plugins').getFirstListItem<Record<string, unknown>>(`key = "${key}"`);
      const rawConfig = record?.['config'];
      const parsed = typeof rawConfig === 'string' ? JSON.parse(rawConfig) : (rawConfig ?? {});
      const configWithEnabled = {
        enabled: Boolean(record?.['enabled']),
        ...parsed,
      } as Record<string, unknown>;
      pluginConfigCache[key] = configWithEnabled;
      return configWithEnabled;
    } catch (error) {
      console.error(`Failed to load plugin config for ${key}:`, error);
      throw new Error(`Unable to load ${key} configuration from plugins collection`);
    }
  };

  useEffect(() => {
    setLocalConfig(config);
    if (Array.isArray(config.conditions)) setQbConditions(config.conditions as Array<{ field: string; operator: string; value?: string; value2?: string }>);
    if (config.logic === 'OR') setQbLogic('OR');
  }, [config]);

  // Auto-fill Evolution Instance ID for WhatsApp node from plugin config
  useEffect(() => {
    if (nodeType !== 'whatsapp.send') return;
    if (localConfig.connectionId !== 'evolution_api') return;
    if (localConfig.sender) return;

    let cancelled = false;
    void (async () => {
      try {
        const cfg = await fetchPluginConfig('evolution_api');
        const defaultSender = String((cfg as Record<string, unknown>).defaultSender ?? (cfg as Record<string, unknown>)['defaultSender'] ?? '').trim();
        if (!cancelled && defaultSender) {
          const next = { ...localConfig, sender: defaultSender };
          setLocalConfig(next);
          onConfigChange(nodeId, next);
        }
      } catch (error) {
        console.warn('Failed to load Evolution instance ID from plugin config:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [nodeType, localConfig.connectionId, localConfig.sender, nodeId, onConfigChange]);

  useEffect(() => {
    if (nodeType !== 'trigger.webhook') return;
    let cancelled = false;
    const loadWebhooks = async () => {
      setWebhookLoading(true);
      setWebhookError(null);
      try {
        const res = await fetch('/api/webhooks/subscriptions');
        if (!res.ok) {
          throw new Error(`Failed to load webhook subscriptions (${res.status})`);
        }
        const data = (await res.json()) as { items?: Array<{ id: string; url: string; description?: string }> };
        if (cancelled) return;
        const items = (data?.items ?? []).map((item) => ({
          value: item.id,
          label: item.description ? `${item.description} (${item.url})` : item.url,
          detail: item.description,
        }));
        setWebhookOptions(items);
        // Only set default if no value is currently selected
        if (!localConfig.subscriptionId && items[0]) {
          const next = { ...localConfig, subscriptionId: items[0].value };
          setLocalConfig(next);
          onConfigChange(nodeId, next);
        }
      } catch (error) {
        if (cancelled) return;
        setWebhookOptions([]);
        setWebhookError(error instanceof Error ? error.message : 'Unable to load webhooks');
      } finally {
        if (!cancelled) setWebhookLoading(false);
      }
    };
    void loadWebhooks();
    return () => {
      cancelled = true;
    };
  }, [nodeType, nodeId, onConfigChange]); // Removed localConfig from dependencies

  if (!nodeDefinition) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-red-500 text-sm">Unknown node type: {nodeType}</div>
        </CardContent>
      </Card>
    );
  }

  const handleConfigChange = (key: string, value: unknown) => {
    let newConfig = { ...localConfig, [key]: value };

    if (nodeType === 'trigger.cron') {
      if (key === 'schedule') {
        const cronValue = CRON_SCHEDULES[String(value)] || '';
        if (cronValue) {
          newConfig = { ...newConfig, cron: cronValue };
        }
      }
      if (key === 'cron') {
        const matched = Object.entries(CRON_SCHEDULES).find(([, cron]) => cron === value);
        if (matched && newConfig.schedule !== matched[0]) {
          newConfig = { ...newConfig, schedule: matched[0] };
        }
      }
    }

    setLocalConfig(newConfig);
    onConfigChange(nodeId, newConfig);
  };

  const handleTestNode = async () => {
    if (!nodeDefinition) return;

    setTesting(true);
    setTestResult(null);

    try {
      // Validate JSON size (max 10KB)
      const MAX_JSON_SIZE = 10000;
      if (testInput.length > MAX_JSON_SIZE) {
        throw new Error(`Test input too large (max ${MAX_JSON_SIZE} characters)`);
      }

      // Parse test input
      let parsedInput;
      try {
        parsedInput = JSON.parse(testInput);
      } catch (e) {
        throw new Error('Invalid JSON in test input: ' + (e instanceof Error ? e.message : 'Parse error'));
      }

      // Validate parsed input is an object
      if (typeof parsedInput !== 'object' || parsedInput === null) {
        throw new Error('Test input must be a JSON object');
      }

      // Simulate node execution based on type
      const result = await simulateNodeExecution(nodeDefinition, localConfig, parsedInput);

      setTestResult({
        success: true,
        output: result,
        timestamp: new Date()
      });

      toast({
        title: 'Node test successful',
        description: `${nodeDefinition.label} executed successfully`
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setTestResult({
        success: false,
        error: errorMessage,
        timestamp: new Date()
      });

      toast({
        title: 'Node test failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setTesting(false);
    }
  };

  const resolveValueFromPath = (source: unknown, path: string | undefined): unknown => {
    if (!path) return undefined;
    if (!path.includes('.')) {
      if (source && typeof source === 'object' && path in (source as Record<string, unknown>)) {
        return (source as Record<string, unknown>)[path];
      }
      return path;
    }
    try {
      return path.split('.').reduce<unknown>((acc, key) => {
        if (acc && typeof acc === 'object') {
          return (acc as Record<string, unknown>)[key];
        }
        return undefined;
      }, source ?? {});
    } catch {
      return undefined;
    }
  };

  const sendWhatsappViaPlugin = async (
    connectionId: unknown,
    payload: {
      to?: string;
      message?: string;
      template?: string;
      variables?: Record<string, unknown>;
      sender?: string;
    }
  ) => {
    const connectionKey = String(connectionId || 'whatsapp_api') as 'whatsapp_api' | 'evolution_api';

    if (connectionKey === 'evolution_api') {
      const cfg = await fetchPluginConfig('evolution_api');
      const baseUrl = String(cfg.baseUrl ?? cfg['baseUrl'] ?? '').trim();
      if (!baseUrl) throw new Error('Evolution API base URL missing in plugin configuration');
      const urlBase = baseUrl.replace(/\/$/, '');
      const authType = String(cfg.authType ?? cfg['authType'] ?? 'header');
      const tokenOrKey = String(cfg.tokenOrKey ?? cfg['tokenOrKey'] ?? '');
      const authHeader = String(cfg.authHeader ?? cfg['authHeader'] ?? 'apikey');
      const senderOverride = typeof payload.sender === 'string' ? payload.sender.trim() : '';
      const defaultSender = String(cfg.defaultSender ?? cfg['defaultSender'] ?? '').trim();
      const resolvedSender = senderOverride || defaultSender;
      if (!resolvedSender) throw new Error('Evolution API default sender is not configured');

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authType === 'header') {
        if (!tokenOrKey) throw new Error('Evolution API access token is missing');
        headers[authHeader || 'apikey'] = tokenOrKey;
      } else if (authType === 'bearer') {
        if (!tokenOrKey) throw new Error('Evolution API bearer token is missing');
        headers.Authorization = `Bearer ${tokenOrKey}`;
      } else if (tokenOrKey) {
        headers.apikey = tokenOrKey;
      }

      const url = `${urlBase}/message/sendText/${encodeURIComponent(resolvedSender)}`;
      const messageText = String(payload.message ?? payload.template ?? '').trim();
      const body = {
        number: payload.to,
        text: messageText,
        options: { delay: 250, presence: 'composing' },
        textMessage: { text: messageText },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(async () => {
        const txt = await response.text().catch(() => '');
        return txt ? { raw: txt } : {};
      });

      if (!response.ok) {
        const errorMessage = (data as { error?: string; message?: string })?.error || (data as { message?: string })?.message || 'Evolution API request failed';
        throw new Error(errorMessage);
      }

      return data;
    }

    const cfg = await fetchPluginConfig('whatsapp_api');
    const provider = String(cfg.provider ?? cfg['provider'] ?? 'meta');
    const templateName = String(payload.template || cfg.defaultTemplate?.['name'] || '').trim();
    const templateLang = String(cfg.defaultTemplate?.['lang'] ?? 'en_US');
    const messageText = String(payload.message ?? '').trim();

    if (provider === 'meta') {
      const phoneNumberId = String(cfg.phoneNumberId ?? cfg['phoneNumberId'] ?? '').trim();
      const accessToken = String(cfg.accessToken ?? cfg['accessToken'] ?? '').trim();
      if (!phoneNumberId || !accessToken) {
        throw new Error('Meta WhatsApp credentials are missing in plugin configuration');
      }
      const url = `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      };
      const body = templateName
        ? {
          messaging_product: 'whatsapp',
          to: payload.to,
          type: 'template' as const,
          template: {
            name: templateName,
            language: { code: templateLang },
            components: payload.variables
              ? [
                {
                  type: 'body',
                  parameters: Object.values(payload.variables).map((value) => ({
                    type: 'text' as const,
                    text: String(value ?? ''),
                  })),
                },
              ]
              : undefined,
          },
        }
        : {
          messaging_product: 'whatsapp',
          to: payload.to,
          type: 'text' as const,
          text: { body: messageText || 'Test message' },
        };

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(async () => {
        const txt = await response.text().catch(() => '');
        return txt ? { raw: txt } : {};
      });
      if (!response.ok) {
        const errorMessage = (data as { error?: string; message?: string })?.error || 'WhatsApp Meta request failed';
        throw new Error(errorMessage);
      }
      return data;
    }

    const baseUrl = String(cfg.baseUrl ?? cfg['baseUrl'] ?? '').trim();
    if (!baseUrl) throw new Error('Custom WhatsApp base URL missing in plugin configuration');
    const urlBase = baseUrl.replace(/\/$/, '');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const accessToken = String(cfg.accessToken ?? cfg['accessToken'] ?? '').trim();
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    const response = await fetch(`${urlBase}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        to: payload.to,
        message: messageText || payload.template,
        template: payload.template,
        variables: payload.variables,
      }),
    });
    const data = await response.json().catch(async () => {
      const txt = await response.text().catch(() => '');
      return txt ? { raw: txt } : {};
    });
    if (!response.ok) {
      const errorMessage = (data as { error?: string; message?: string })?.error || 'Custom WhatsApp request failed';
      throw new Error(errorMessage);
    }
    return data;
  };

  // Simulate individual node execution
  const simulateNodeExecution = async (
    definition: NodeDefinition,
    config: Record<string, unknown>,
    input: unknown
  ): Promise<unknown> => {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1500));

    // Simulate different node behaviors
    switch (definition.type) {
      case 'trigger.manual':
        return { ...config, triggered_at: new Date().toISOString(), input };

      case 'pb.find': {
        if (!config.collection) throw new Error('Collection is required');
        const collection = String(config.collection);
        const limit = Math.min(Math.max(Number(config.limit) || 50, 1), 500);
        const page = Number(config.page) || 1;
        const options: Record<string, unknown> = {};
        if (config.filter) options.filter = String(config.filter);
        if (config.sort) options.sort = String(config.sort);
        if (config.expand) options.expand = String(config.expand);
        if (config.fields) options.fields = String(config.fields);

        await ensureAdminAuth();
        const list = await pb.collection(collection).getList(page, limit, options);
        return {
          items: list.items,
          totalItems: list.totalItems,
          page: list.page,
          totalPages: list.totalPages,
          collection,
          filter: options.filter || null,
          sort: options.sort || null,
        };
      }

      case 'pb.getOne': {
        if (!config.collection) throw new Error('Collection is required');
        const collection = String(config.collection);
        const recordId = config.recordId ? String(config.recordId) : '';
        const options: Record<string, unknown> = {};
        if (config.expand) options.expand = String(config.expand);
        if (config.fields) options.fields = String(config.fields);
        if (config.sort) options.sort = String(config.sort);

        await ensureAdminAuth();
        if (recordId) {
          const rec = await pb.collection(collection).getOne(recordId, options);
          return { record: rec, exists: !!rec?.id };
        }
        const filter = config.filter ? String(config.filter) : '';
        if (!filter) throw new Error('Provide Record ID or a filter');
        const rec = await pb.collection(collection).getFirstListItem(filter, options);
        return { record: rec, exists: !!rec?.id };
      }

      case 'logic.if': {
        if (!config.condition) throw new Error('Condition is required');
        const conditionResult = Math.random() > 0.5; // Random true/false
        return { condition_result: conditionResult, input };
      }

      case 'iterate.each': {
        const path = typeof config.path === 'string' && config.path.trim().length > 0 ? config.path.trim() : 'items';
        const resolved = path ? resolveValueFromPath(input, path) : input;
        const items = Array.isArray(resolved)
          ? resolved
          : resolved == null
            ? []
            : [resolved];
        return {
          total_items: items.length,
          processed_items: items.map((item, index) => ({ index, item }))
        };
      }

      case 'whatsapp.send': {
        const to = String(resolveValueFromPath(input, typeof config.toPath === 'string' ? config.toPath : undefined) ?? '').trim();
        if (!to) {
          throw new Error('Phone number path did not resolve to a recipient');
        }
        const message = typeof config.template === 'string' ? config.template : undefined;
        if (!message || message.trim().length === 0) {
          throw new Error('Message template is required');
        }
        const result = await sendWhatsappViaPlugin(config.connectionId, {
          to,
          message,
          template: message,
          sender: typeof config.sender === 'string' ? config.sender : undefined,
        });
        return {
          delivered: true,
          recipient: to,
          response: result,
        };
      }

      case 'email.send':
        if (!config.template) throw new Error('Email template is required');
        return {
          message_id: `email_${Date.now()}`,
          status: 'sent',
          recipient: config.to || 'test@example.com',
          sent_at: new Date().toISOString()
        };

      case 'log':
        return {
          logged_at: new Date().toISOString(),
          level: config.level || 'info',
          message: config.message || 'Test log message',
          input
        };

      case 'util.delay': {
        const amount = Math.max(0, Number(config.amount) || 0);
        const unit = String(config.unit || 'seconds');
        const multiplier = unit === 'hours' ? 60 * 60 * 1000 : unit === 'minutes' ? 60 * 1000 : 1000;
        const delayMs = amount * multiplier;
        return {
          delayed_for: delayMs,
          completed_at: new Date().toISOString(),
          input
        };
      }

      case 'http.request':
        if (!config.url) throw new Error('URL is required');
        return {
          status: 200,
          data: { message: 'Mock HTTP response', timestamp: new Date().toISOString() },
          headers: { 'content-type': 'application/json' },
          url: config.url
        };

      default:
        // Random success/failure for unknown nodes
        if (Math.random() < 0.1) {
          throw new Error(`Simulated error in ${definition.type} node`);
        }
        return {
          node_type: definition.type,
          processed_at: new Date().toISOString(),
          input,
          config
        };
    }
  };

  const renderConfigField = (field: NodeConfigField) => {
    const value = localConfig[field.key] ?? field.defaultValue ?? '';

    switch (field.type) {
      case 'text':
        return (
          <Input
            value={String(value)}
            onChange={(e) => handleConfigChange(field.key, e.target.value)}
            placeholder={field.placeholder}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={String(value)}
            onChange={(e) => handleConfigChange(field.key, Number(e.target.value))}
            placeholder={field.placeholder}
          />
        );

      case 'boolean':
        return (
          <Switch
            checked={Boolean(value)}
            onCheckedChange={(checked) => handleConfigChange(field.key, checked)}
          />
        );

      case 'select':
        return (
          <Select
            value={String(value)}
            onValueChange={(newValue) => handleConfigChange(field.key, newValue)}
            disabled={field.key === 'subscriptionId' && webhookLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {(field.key === 'subscriptionId' ? webhookOptions : field.options ?? []).map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
              {field.key === 'subscriptionId' && (webhookError || (!webhookLoading && webhookOptions.length === 0)) && (
                <SelectItem value="__no-webhooks" disabled>
                  {webhookError ? `Error: ${webhookError}` : 'No saved webhooks found'}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        );

      case 'textarea':
        return (
          <Textarea
            value={String(value)}
            onChange={(e) => handleConfigChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            rows={3}
          />
        );

      case 'json':
        return (
          <Textarea
            value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleConfigChange(field.key, parsed);
              } catch {
                // Keep as string if not valid JSON
                handleConfigChange(field.key, e.target.value);
              }
            }}
            placeholder={field.placeholder}
            className="font-mono text-xs"
            rows={4}
          />
        );

      case 'connection':
        return (
          <Select
            value={String(value)}
            onValueChange={(newValue) => handleConfigChange(field.key, newValue)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select connection..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="whatsapp_api">WhatsApp API (Plugins Manager)</SelectItem>
              <SelectItem value="evolution_api">Evolution API (Plugins Manager)</SelectItem>
            </SelectContent>
          </Select>
        );

      default:
        return (
          <Input
            value={String(value)}
            onChange={(e) => handleConfigChange(field.key, e.target.value)}
            placeholder={field.placeholder}
          />
        );
    }
  };

  const categoryColors = {
    trigger: 'bg-green-100 text-green-800 border-green-200',
    data: 'bg-blue-100 text-blue-800 border-blue-200',
    logic: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    messaging: 'bg-purple-100 text-purple-800 border-purple-200',
    payments: 'bg-red-100 text-red-800 border-red-200',
    utilities: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const whatsappTemplateGroups: Array<{
    title: string;
    items: { token: string; label: string }[];
  }> = [
    {
      title: 'Customer',
      items: [
        { token: 'input.customer_name', label: 'Name' },
        { token: 'input.customer_email', label: 'Email' },
        { token: 'input.customer_id', label: 'ID' },
      ],
    },
    {
      title: 'Event',
      items: [
        { token: 'input.event', label: 'Type' },
        { token: 'input.stage', label: 'Stage' },
        { token: 'input.metadata.title', label: 'Page' },
        { token: 'input.metadata.url', label: 'URL' },
        { token: 'input.metadata.event_type', label: 'Event key' },
      ],
    },
    {
      title: 'Order',
      items: [
        { token: 'input.metadata.order_id', label: 'Order ID' },
        { token: 'input.metadata.total', label: 'Total' },
      ],
    },
  ];

  const whatsappPhonePathOptions = [
    { path: 'input.phone', label: 'From customer' },
    { path: 'input.metadata.phone', label: 'From event' },
  ];

  const insertWhatsAppTemplateVar = (token: string) => {
    const current = String(localConfig.template ?? '');
    const insertion = `{{${token}}}`;
    const next = current
      ? `${current}${current.endsWith(' ') ? '' : ' '}${insertion}`
      : insertion;
    handleConfigChange('template', next);
  };

  const setWhatsAppPhonePath = (path: string) => {
    handleConfigChange('toPath', path);
  };

  const getVisibleConfigFields = (): NodeConfigField[] => {
    if (nodeType === 'whatsapp.send') {
      const msgType = String(localConfig.messageType ?? 'text');
      return nodeDefinition.config.filter((field) => {
        if (['mediaType', 'mediaRecordId', 'mediaFileName', 'mediaCaption'].includes(field.key)) {
          return msgType === 'media';
        }
        return true;
      });
    }
    return nodeDefinition.config;
  };

  // Helpers for Find Records (pb.find)
  const getCollection = (): string => String((localConfig.collection ?? '') || '');
  const setCollection = (value: string) => {
    const next = { ...localConfig, collection: value };
    setLocalConfig(next);
    onConfigChange(nodeId, next);
  };

  const getFieldsForCollection = (collection: string): Array<{ value: string; label: string; type: 'text' | 'number' | 'enum' | 'date' | 'relation' | 'bool' }> => {
    switch (collection) {
      case 'orders':
        return [
          { value: 'status', label: 'Status', type: 'enum' },
          { value: 'payment_status', label: 'Payment Status', type: 'enum' },
          { value: 'total', label: 'Total Amount', type: 'number' },
          { value: 'created', label: 'Created At', type: 'date' },
          { value: 'user_id', label: 'User', type: 'relation' },
        ];
      case 'users':
        return [
          { value: 'name', label: 'Name', type: 'text' },
          { value: 'email', label: 'Email', type: 'text' },
          { value: 'created', label: 'Created At', type: 'date' },
        ];
      default:
        return [
          { value: 'id', label: 'ID', type: 'text' },
          { value: 'created', label: 'Created At', type: 'date' },
        ];
    }
  };

  const enumOptionsFor = (field: string): string[] => {
    if (getCollection() === 'orders') {
      if (field === 'status') return ['pending', 'processing', 'out_for_delivery', 'delivered', 'cancelled'];
      if (field === 'payment_status') return ['pending', 'paid', 'failed', 'authorized'];
    }
    return [];
  };

  const operatorsForType = (type: string): Array<{ value: string; label: string; needsTwo?: boolean; usesEnum?: boolean; relativeTime?: boolean }> => {
    switch (type) {
      case 'text':
        return [
          { value: 'eq', label: 'is' },
          { value: 'neq', label: 'is not' },
          { value: 'contains', label: 'contains' },
          { value: 'starts', label: 'starts with' },
        ];
      case 'number':
        return [
          { value: 'eq', label: '=' },
          { value: 'neq', label: '≠' },
          { value: 'gt', label: '>' },
          { value: 'gte', label: '≥' },
          { value: 'lt', label: '<' },
          { value: 'lte', label: '≤' },
          { value: 'between', label: 'between', needsTwo: true },
        ];
      case 'enum':
        return [
          { value: 'eq', label: 'is', usesEnum: true },
          { value: 'neq', label: 'is not', usesEnum: true },
        ];
      case 'relation':
        return [
          { value: 'eq', label: 'is' },
          { value: 'neq', label: 'is not' },
        ];
      case 'bool':
        return [
          { value: 'istrue', label: 'is true' },
          { value: 'isfalse', label: 'is false' },
        ];
      case 'date':
        return [
          { value: 'after', label: 'after' },
          { value: 'before', label: 'before' },
          { value: 'between', label: 'between', needsTwo: true },
          { value: 'last', label: 'in last', relativeTime: true },
        ];
      default:
        return [{ value: 'eq', label: 'is' }];
    }
  };

  const compileFilter = (conditions: typeof qbConditions, logic: 'AND' | 'OR') => {
    const collectionFields = getFieldsForCollection(getCollection());
    const findType = (f: string) => collectionFields.find(x => x.value === f)?.type || 'text';
    const parts: string[] = [];

    // Sanitize field names to prevent injection
    const sanitizeFieldName = (field: string): string => {
      // Only allow alphanumeric, underscore, and dot (for relations)
      if (!/^[a-zA-Z0-9_.]+$/.test(field)) {
        throw new Error(`Invalid field name: ${field}`);
      }
      return field;
    };

    // Enhanced string escaping
    const escapeString = (s: string): string => {
      return s
        .replace(/\\/g, '\\\\')  // Escape backslashes first
        .replace(/"/g, '\\"')     // Escape quotes
        .replace(/\n/g, '\\n')    // Escape newlines
        .replace(/\r/g, '\\r')    // Escape carriage returns
        .replace(/\t/g, '\\t');   // Escape tabs
    };

    const q = (s: string) => `"${escapeString(s)}"`;

    // Validate number format
    const validateNumber = (val: string): string => {
      const num = parseFloat(val);
      if (isNaN(num)) {
        throw new Error(`Invalid number: ${val}`);
      }
      return num.toString();
    };

    // Validate date/time format for relative time
    const validateRelativeTime = (val: string): string => {
      if (!/^\d+[hdm]$/.test(val)) {
        throw new Error(`Invalid relative time format: ${val}. Use format like: 1h, 24h, 7d`);
      }
      return val;
    };

    conditions.forEach(c => {
      if (!c.field || !c.operator) return;

      try {
        const safeField = sanitizeFieldName(c.field);
        const t = findType(c.field);
        const v = (c.value ?? '').trim();
        const v2 = (c.value2 ?? '').trim();

        switch (t) {
          case 'enum':
          case 'text':
          case 'relation':
            if (c.operator === 'eq') parts.push(`${safeField} = ${q(v)}`);
            else if (c.operator === 'neq') parts.push(`${safeField} != ${q(v)}`);
            else if (c.operator === 'contains') parts.push(`${safeField} ~ ${q(v)}`);
            else if (c.operator === 'starts') parts.push(`${safeField} ~ ${q('^' + v)}`);
            break;
          case 'number':
            const numV = validateNumber(v);
            const numV2 = v2 ? validateNumber(v2) : '';
            if (c.operator === 'between') parts.push(`${safeField} >= ${numV} && ${safeField} <= ${numV2}`);
            else if (c.operator === 'gt') parts.push(`${safeField} > ${numV}`);
            else if (c.operator === 'gte') parts.push(`${safeField} >= ${numV}`);
            else if (c.operator === 'lt') parts.push(`${safeField} < ${numV}`);
            else if (c.operator === 'lte') parts.push(`${safeField} <= ${numV}`);
            else if (c.operator === 'eq') parts.push(`${safeField} = ${numV}`);
            else if (c.operator === 'neq') parts.push(`${safeField} != ${numV}`);
            break;
          case 'date':
            if (c.operator === 'last') {
              const validTime = validateRelativeTime(v);
              parts.push(`${safeField} >= @now-"${validTime}"`);
            } else if (c.operator === 'between') {
              parts.push(`${safeField} >= ${q(v)} && ${safeField} <= ${q(v2)}`);
            } else if (c.operator === 'after') parts.push(`${safeField} >= ${q(v)}`);
            else if (c.operator === 'before') parts.push(`${safeField} <= ${q(v)}`);
            break;
        }
      } catch (error) {
        console.error('Filter compilation error:', error);
        // Skip invalid conditions instead of breaking the entire filter
      }
    });
    const joiner = logic === 'OR' ? ' || ' : ' && ';
    return parts.join(joiner);
  };

  const pushConditionsToConfig = (nextConds: typeof qbConditions, nextLogic: 'AND' | 'OR') => {
    const nextFilter = compileFilter(nextConds, nextLogic);
    const nextConfig = { ...localConfig, conditions: nextConds, logic: nextLogic, filter: nextFilter };
    setLocalConfig(nextConfig);
    onConfigChange(nodeId, nextConfig);
  };

  const addCondition = () => {
    const next = [...qbConditions, { field: '', operator: 'eq', value: '' }];
    setQbConditions(next);
    pushConditionsToConfig(next, qbLogic);
  };
  const removeCondition = (idx: number) => {
    const next = qbConditions.filter((_, i) => i !== idx);
    setQbConditions(next);
    pushConditionsToConfig(next, qbLogic);
  };

  const updateCondition = (idx: number, patch: Partial<{ field: string; operator: string; value?: string; value2?: string }>) => {
    const next = qbConditions.map((c, i) => i === idx ? { ...c, ...patch } : c);
    setQbConditions(next);
    pushConditionsToConfig(next, qbLogic);
  };

  // --- Simple helpers for Sort/Limit/Expand/Fields ---
  const addSortRow = (field?: string) => {
    const next: SortRow[] = [...sortRows, { field: field || '', dir: 'desc' as const }];
    setSortRows(next);
    handleConfigChange('sort', stringifySort(next));
  };
  const updateSortRow = (idx: number, patch: Partial<SortRow>) => {
    const next = sortRows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    setSortRows(next);
    handleConfigChange('sort', stringifySort(next));
  };
  const removeSortRow = (idx: number) => {
    const next = sortRows.filter((_, i) => i !== idx);
    setSortRows(next);
    handleConfigChange('sort', stringifySort(next));
  };

  const relationFields = (collection: string) => getFieldsForCollection(collection).filter(f => f.type === 'relation');
  const valueFields = (collection: string) => getFieldsForCollection(collection).filter(f => f.type !== 'relation');
  const selectedExpands = String(localConfig.expand || '').split(',').map(s => s.trim()).filter(Boolean);
  const toggleExpand = (key: string) => {
    const set = new Set(selectedExpands);
    if (set.has(key)) set.delete(key); else set.add(key);
    const next = Array.from(set).join(',');
    handleConfigChange('expand', next);
  };
  const selectedFields = String(localConfig.fields || '').split(',').map(s => s.trim()).filter(Boolean);
  const toggleFieldKey = (key: string) => {
    const set = new Set(selectedFields);
    if (set.has(key)) set.delete(key); else set.add(key);
    const next = Array.from(set).join(',');
    handleConfigChange('fields', next);
  };
  const useAllFields = () => handleConfigChange('fields', '');

  const renderFindRecordsBuilder = () => {
    const collection = getCollection();
    const fields = getFieldsForCollection(collection);
    return (
      <div className="space-y-4">
        <h5 className="font-medium text-sm">Configuration</h5>
        {/* Collection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Collection <span className="text-red-500">*</span></Label>
          <Select value={collection} onValueChange={setCollection}>
            <SelectTrigger>
              <SelectValue placeholder="Select collection" />
            </SelectTrigger>
            <SelectContent>
              {[
                { value: 'orders', label: 'Orders' },
                { value: 'users', label: 'Users' },
                { value: 'products', label: 'Products' },
              ].map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Conditions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h5 className="font-medium text-sm">Conditions</h5>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Match</Label>
              <Select value={qbLogic} onValueChange={(v) => { const nv = (v as 'AND' | 'OR'); setQbLogic(nv); pushConditionsToConfig(qbConditions, nv); }}>
                <SelectTrigger className="h-8 w-[110px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AND">All (AND)</SelectItem>
                  <SelectItem value="OR">Any (OR)</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={addCondition}>Add</Button>
            </div>
          </div>

          <div className="space-y-2">
            {qbConditions.length === 0 && (
              <div className="text-xs text-muted-foreground">No conditions. Click Add to start.</div>
            )}
            {qbConditions.map((c, idx) => {
              const fieldType = fields.find(f => f.value === c.field)?.type || 'text';
              const ops = operatorsForType(fieldType);
              return (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  {/* Field */}
                  <div className="col-span-3">
                    <Select value={c.field} onValueChange={(v) => updateCondition(idx, { field: v })}>
                      <SelectTrigger><SelectValue placeholder="Field" /></SelectTrigger>
                      <SelectContent>
                        {fields.map(f => (<SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Operator */}
                  <div className="col-span-3">
                    <Select value={c.operator} onValueChange={(v) => updateCondition(idx, { operator: v })}>
                      <SelectTrigger><SelectValue placeholder="Operator" /></SelectTrigger>
                      <SelectContent>
                        {ops.map(o => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Value(s) */}
                  <div className="col-span-5 flex gap-2">
                    {fieldType === 'enum' ? (
                      <Select value={c.value ?? ''} onValueChange={(v) => updateCondition(idx, { value: v })}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Select value" /></SelectTrigger>
                        <SelectContent>
                          {enumOptionsFor(c.field).map(v => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    ) : fieldType === 'date' && c.operator === 'last' ? (
                      <Input value={c.value ?? ''} onChange={(e) => updateCondition(idx, { value: e.target.value })} placeholder="e.g., 1h, 24h, 7d" />
                    ) : (
                      <>
                        <Input value={c.value ?? ''} onChange={(e) => updateCondition(idx, { value: e.target.value })} placeholder="Value" />
                        {ops.find(o => o.value === c.operator)?.needsTwo && (
                          <Input value={c.value2 ?? ''} onChange={(e) => updateCondition(idx, { value2: e.target.value })} placeholder="and" />
                        )}
                      </>
                    )}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button size="icon" variant="ghost" onClick={() => removeCondition(idx)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sort and Limit (simplified) */}
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-sm">Sort</Label>
            {sortRows.length === 0 && (
              <div className="text-xs text-muted-foreground">No sorting. Click Add to sort.</div>
            )}
            <div className="space-y-2">
              {sortRows.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-7">
                    <Select value={row.field} onValueChange={(v) => updateSortRow(idx, { field: v })}>
                      <SelectTrigger><SelectValue placeholder="Field" /></SelectTrigger>
                      <SelectContent>
                        {fields.map(f => (<SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Select value={row.dir} onValueChange={(v) => updateSortRow(idx, { dir: (v as 'asc' | 'desc') })}>
                      <SelectTrigger><SelectValue placeholder="Direction" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">Desc</SelectItem>
                        <SelectItem value="asc">Asc</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <Button size="icon" variant="ghost" onClick={() => removeSortRow(idx)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => addSortRow(fields[0]?.value)}>Add sort</Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Max items</Label>
            <Select value={String(localConfig.limit ?? 50)} onValueChange={(v) => handleConfigChange('limit', Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100, 200, 500].map(n => (<SelectItem key={n} value={String(n)}>{n}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Expand / Fields (chips) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-sm">Expand relations</Label>
            <div className="flex flex-wrap gap-2">
              {relationFields(collection).length === 0 && (
                <span className="text-xs text-muted-foreground">No relations</span>
              )}
              {relationFields(collection).map(r => {
                const active = selectedExpands.includes(r.value);
                return (
                  <Button
                    key={r.value}
                    size="sm"
                    variant="outline"
                    className={active ? 'bg-blue-50 border-blue-300 text-blue-700' : ''}
                    onClick={() => toggleExpand(r.value)}
                  >
                    {r.label}
                  </Button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Fields</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className={selectedFields.length === 0 ? 'bg-blue-50 border-blue-300 text-blue-700' : ''}
                onClick={useAllFields}
              >
                All fields
              </Button>
              {valueFields(collection).map(f => {
                const active = selectedFields.includes(f.value);
                return (
                  <Button
                    key={f.value}
                    size="sm"
                    variant="outline"
                    className={active ? 'bg-blue-50 border-blue-300 text-blue-700' : ''}
                    onClick={() => toggleFieldKey(f.value)}
                  >
                    {f.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Advanced (read-only) */}
        <div className="text-xs text-muted-foreground">
          Generated filter (read-only): <span className="font-mono">{String(localConfig.filter || compileFilter(qbConditions, qbLogic) || '(none)')}</span>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <CardTitle className="text-lg">Node Configuration</CardTitle>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onDeleteNode(nodeId)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Node Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{nodeDefinition.icon}</span>
            <div>
              <h4 className="font-medium">{nodeDefinition.label}</h4>
              <Badge
                variant="outline"
                className={`text-xs ${categoryColors[nodeDefinition.category]}`}
              >
                {nodeDefinition.category}
              </Badge>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            <strong>ID:</strong> {nodeId}
          </div>
        </div>

        {/* Configuration Fields */}
        {nodeType === 'pb.find' ? (
          renderFindRecordsBuilder()
        ) : nodeDefinition.config.length > 0 ? (
          <div className="space-y-4">
            <h5 className="font-medium text-sm">Configuration</h5>
            {getVisibleConfigFields().map((field) => (
              <div key={field.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`${nodeId}-${field.key}`} className="text-sm font-medium">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  {field.type === 'boolean' && renderConfigField(field)}
                </div>
                {field.type !== 'boolean' && (
                  <div className="space-y-1">
                    {renderConfigField(field)}

                    {nodeType === 'whatsapp.send' && field.key === 'template' && (
                      <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-3">
                        {whatsappTemplateGroups.map((group) => (
                          <Select
                            key={group.title}
                            onValueChange={(token) => {
                              insertWhatsAppTemplateVar(token);
                            }}
                          >
                            <SelectTrigger className="h-8 text-[11px]">
                              <SelectValue placeholder={group.title} />
                            </SelectTrigger>
                            <SelectContent>
                              {group.items.map((variable) => (
                                <SelectItem key={variable.token} value={variable.token}>
                                  {variable.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ))}
                      </div>
                    )}

                    {nodeType === 'whatsapp.send' && field.key === 'toPath' && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {whatsappPhonePathOptions.map((option) => (
                          <Button
                            key={option.path}
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-[11px]"
                            onClick={() => setWhatsAppPhonePath(option.path)}
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : null}

        {/* Node Testing */}
        <div className="space-y-3 pt-4 border-t">
          <h5 className="font-medium text-sm">Test Node</h5>
          <div className="space-y-3">
            <div>
              <Label htmlFor="test-input" className="text-xs">Test Input (JSON)</Label>
              <Textarea
                id="test-input"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder='{"test": true, "user_id": "123"}'
                className="font-mono text-xs"
                rows={3}
              />
            </div>

            <Button
              onClick={handleTestNode}
              disabled={testing}
              size="sm"
              className="w-full"
            >
              {testing ? (
                <>
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Testing...
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 mr-2" />
                  Test Node
                </>
              )}
            </Button>

            {/* Test Results */}
            {testResult && (
              <div className={`p-3 rounded-md border ${testResult.success
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
                }`}>
                <div className="flex items-center gap-2 mb-2">
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                    {testResult.success ? 'Test Successful' : 'Test Failed'}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {testResult.timestamp.toLocaleTimeString()}
                  </span>
                </div>

                {testResult.success && testResult.output && (
                  <div>
                    <p className="text-xs font-medium text-green-700 mb-1">Output:</p>
                    <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-32">
                      {JSON.stringify(testResult.output, null, 2)}
                    </pre>
                  </div>
                )}

                {!testResult.success && testResult.error && (
                  <div>
                    <p className="text-xs font-medium text-red-700 mb-1">Error:</p>
                    <p className="text-xs text-red-600 bg-white p-2 rounded border">
                      {testResult.error}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Input/Output Info */}
        <div className="space-y-2 pt-4 border-t">
          <h5 className="font-medium text-sm">Connections</h5>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-medium text-muted-foreground mb-1">Inputs</p>
              {nodeDefinition.inputs && nodeDefinition.inputs.length > 0 ? (
                nodeDefinition.inputs.map((input) => (
                  <div key={input.id} className="flex items-center gap-1">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: input.type === 'control' ? '#ff6b6b' : '#4dabf7' }}
                    />
                    <span>{input.label}</span>
                  </div>
                ))
              ) : (
                <span className="text-muted-foreground">None</span>
              )}
            </div>
            <div>
              <p className="font-medium text-muted-foreground mb-1">Outputs</p>
              {nodeDefinition.outputs && nodeDefinition.outputs.length > 0 ? (
                nodeDefinition.outputs.map((output) => (
                  <div key={output.id} className="flex items-center gap-1">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: output.type === 'control' ? '#ff6b6b' : '#4dabf7' }}
                    />
                    <span>{output.label}</span>
                  </div>
                ))
              ) : (
                <span className="text-muted-foreground">None</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
