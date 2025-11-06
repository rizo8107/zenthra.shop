import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ClientResponseError, RecordModel } from 'pocketbase';

import { pb, ensureAdminAuth } from '@/lib/pocketbase';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  Panel,
  type Node,
  type Edge,
  type Connection,
  type OnSelectionChangeParams,
  type NodeTypes,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Activity,
  AlertCircle,
  Clock,
  Copy,
  MessageCircle,
  GitBranch,
  Globe,
  RefreshCw,
  Rocket,
  Trash,
  Workflow,
  Play,
  Save,
  Pause,
  Loader2,
  PlusCircle,
  ArrowLeft,
  ShoppingBag,
  CircleStop,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

type PaletteNodeKey =
  | 'start'
  | 'wait'
  | 'message'
  | 'condition'
  | 'webhook'
  | 'order'
  | 'cart';

type WaitUnit = 'minutes' | 'hours' | 'days';
type MessageChannel = 'whatsapp' | 'email' | 'sms' | 'evolution_text' | 'evolution_media';
type MessageTemplateId = 'payment_reminder' | 'cart_followup' | 'shipping_update' | 'custom';
type WebhookMethod = 'GET' | 'POST';

type AutomationNodeData = {
  type: PaletteNodeKey;
  label: string;
  description?: string;
  waitMinutes?: number;
  waitUnit?: WaitUnit;
  skipWeekends?: boolean;
  channel?: MessageChannel;
  messageTemplateId?: MessageTemplateId;
  ctaUrl?: string;
  sendFollowUp?: boolean;
  customMessage?: string;
  recipientPath?: string;
  fallbackRecipient?: string;
  eventFields?: string[];
  condition?: string;
  conditionTrueLabel?: string;
  conditionFalseLabel?: string;
  conditionStrict?: boolean;
  webhookUrl?: string;
  webhookMethod?: WebhookMethod;
  webhookSecret?: string;
  verifySSL?: boolean;
  orderTrigger?: 'created' | 'paid' | 'cancelled' | 'fulfilled';
  cartTrigger?: 'new_abandon' | 'reminder' | 'recovered';
  evolutionMessage?: {
    text?: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video' | 'audio' | 'document';
    caption?: string;
    delayMs?: number;
  };
  activityEventKey?: string;
  activityEventLabel?: string;
  activityStage?: string;
  activityPreview?: Record<string, any>;
};

const messageTemplates: { id: MessageTemplateId; label: string }[] = [
  { id: 'payment_reminder', label: 'Payment reminder' },
  { id: 'cart_followup', label: 'Cart follow-up' },
  { id: 'shipping_update', label: 'Shipping update' },
  { id: 'custom', label: 'Custom message' },
];

const waitUnitOptions: { value: WaitUnit; label: string; helper: string }[] = [
  { value: 'minutes', label: 'Minutes', helper: 'Best for short delays (< 1 hour).' },
  { value: 'hours', label: 'Hours', helper: 'Use for multi-hour waits between nudges.' },
  { value: 'days', label: 'Days', helper: 'Ideal for longer nurture sequences.' },
];

const channelOptions: { value: MessageChannel; label: string; helper: string }[] = [
  { value: 'whatsapp', label: 'WhatsApp', helper: 'Send via WhatsApp Business templates.' },
  { value: 'email', label: 'Email', helper: 'Deliver transactional emails through SMTP.' },
  { value: 'sms', label: 'SMS', helper: 'Short text follow-ups to phone numbers.' },
  { value: 'evolution_text', label: 'Evolution API · Text', helper: 'Send a text message through Evolution.' },
  { value: 'evolution_media', label: 'Evolution API · Media', helper: 'Send media with Evolution API.' },
];

const RECIPIENT_PATH_OPTIONS: { value: string; label: string; helper: string }[] = [
  { value: 'order.customer_phone', label: 'Order · customer_phone', helper: 'Uses the enriched order record phone number.' },
  { value: 'data.customer_phone', label: 'Event payload · customer_phone', helper: 'Reads customer_phone from the webhook payload root.' },
  { value: 'data.payload.customer_phone', label: 'Payload · customer_phone', helper: 'Looks up customer_phone nested inside payload.' },
  { value: 'customer.phone', label: 'Customer record · phone', helper: 'Falls back to the loaded PocketBase customer profile.' },
  { value: 'metadata.customer_phone', label: 'Metadata · customer_phone', helper: 'Uses metadata from the incoming event.' },
];

const CUSTOM_RECIPIENT_OPTION = '__custom__';

type JourneyEvent = {
  id?: string;
  event?: string;
  stage?: string;
  timestamp?: string;
  metadata?: Record<string, any>;
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  payload?: Record<string, unknown>;
  data?: Record<string, unknown>;
  order?: Record<string, unknown>;
  customer?: Record<string, unknown>;
};

type ActivityEventOption = {
  key: string;
  label: string;
  stage?: string;
  description?: string;
  example?: JourneyEvent | null;
};

const FALLBACK_ACTIVITY_OPTIONS: ActivityEventOption[] = [
  { key: 'order.created', label: 'Order Created', stage: 'Purchase' },
  { key: 'order.paid', label: 'Order Paid', stage: 'Purchase' },
  { key: 'order.fulfilled', label: 'Order Fulfilled', stage: 'Retention' },
  { key: 'payment.succeeded', label: 'Payment Succeeded', stage: 'Purchase' },
  { key: 'payment.failed', label: 'Payment Failed', stage: 'Consideration' },
  { key: 'cart.abandoned', label: 'Cart Abandoned', stage: 'Consideration' },
  { key: 'cart.recovered', label: 'Cart Recovered', stage: 'Purchase' },
  { key: 'email.opened', label: 'Email Opened', stage: 'Awareness' },
  { key: 'link.clicked', label: 'Link Clicked', stage: 'Awareness' },
];

const formatActivityLabel = (value: string): string =>
  value
    .split(/[-_.]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

type LiveActivity = {
  id: string;
  event: string;
  capturedAt: string;
  stage?: string;
  status: 'captured' | 'error';
  payload?: JourneyEvent;
  error?: string;
};

const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  if (typeof process !== 'undefined' && process.env?.PB_BASE_URL) {
    return process.env.PB_BASE_URL.replace(/\/$/, '');
  }
  return '';
};

const buildJourneyEndpoint = (path: string, baseOverride?: string | null): string => {
  if (path.startsWith('http')) return path;
  const base = (baseOverride && baseOverride.trim()) || getApiBaseUrl();
  if (!base) return path.startsWith('/') ? path : `/${path}`;
  const sanitized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${sanitized}`;
};

const discoverApiBaseUrl = async (): Promise<string | null> => {
  try {
    const candidates: string[] = [];
    // env-driven (Vite)
    try {
      const envOrigin = (import.meta as any)?.env?.VITE_API_ORIGIN as string | undefined;
      if (envOrigin && typeof envOrigin === 'string') candidates.push(envOrigin);
    } catch {}
    // window origin
    if (typeof window !== 'undefined' && window.location?.origin) candidates.push(window.location.origin);
    // common dev ports
    candidates.push('http://localhost:3000', 'http://127.0.0.1:3000');

    for (const origin of candidates) {
      try {
        const sameOrigin = typeof window !== 'undefined' && origin === window.location.origin;
        const res = await fetch(`${origin}/api/customer-journey/health`, {
          credentials: sameOrigin ? 'include' : 'omit',
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) continue;
        const ct = res.headers.get('content-type')?.toLowerCase() || '';
        if (!ct.includes('application/json')) continue;
        const body = await res.json().catch(() => null);
        if (body && body.success) return origin;
      } catch {}
    }
    return null;
  } catch {
    return null;
  }
};

const fetchRecentJourneyEvents = async (base?: string | null): Promise<JourneyEvent[]> => {
  const endpoint = buildJourneyEndpoint('/api/customer-journey/data', base);
  const sameOrigin = typeof window !== 'undefined' && base ? base === window.location.origin : true;
  const response = await fetch(endpoint, { credentials: sameOrigin ? 'include' : 'omit', headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`Failed to load journey events (HTTP ${response.status})`);
  }
  const text = await response.text();
  if (!text) return [];
  let body: any;
  try {
    body = JSON.parse(text);
  } catch (error) {
    const snippet = text.slice(0, 120).replace(/\s+/g, ' ').trim();
    throw new Error(`Journey API returned non-JSON response: ${snippet}`);
  }
  if (!body?.success) {
    throw new Error(body?.error || 'Journey data response invalid');
  }
  const events: JourneyEvent[] = Array.isArray(body.events) ? body.events : [];
  return events;
};

const getDeepValue = (obj: unknown, rawPath: string): unknown => {
  if (!obj || typeof rawPath !== 'string') return undefined;
  const segments = rawPath
    .replace(/\[(\w+)\]/g, '.$1')
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (segments.length === 0) return undefined;
  return segments.reduce<unknown>((acc, segment) => {
    if (acc && typeof acc === 'object' && segment in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[segment];
    }
    return undefined;
  }, obj);
};

const formatSampleValue = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.length > 40 ? `${trimmed.slice(0, 37)}…` : trimmed;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `${value.length} ${value.length === 1 ? 'item' : 'items'}`;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>);
    if (keys.length === 0) return 'Object (empty)';
    return `Object (${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '…' : ''})`;
  }
  return null;
};

const collectPlaceholderPaths = (value: unknown, prefix = '', acc: Set<string> = new Set()): string[] => {
  if (value === undefined || value === null) {
    return Array.from(acc).sort();
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      const path = prefix ? `${prefix}[${index}]` : `[${index}]`;
      collectPlaceholderPaths(item, path, acc);
    });
  } else if (typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([key, val]) => {
      const trimmed = key.trim();
      if (!trimmed) return;
      const path = prefix ? `${prefix}.${trimmed}` : trimmed;
      if (val !== null && typeof val === 'object') {
        collectPlaceholderPaths(val, path, acc);
      } else {
        acc.add(path);
      }
    });
  } else if (prefix) {
    acc.add(prefix);
  }

  return Array.from(acc).sort();
};

const buildPreviewContext = (eventPreview?: Record<string, unknown> | null): Record<string, unknown> => {
  if (!eventPreview || typeof eventPreview !== 'object') {
    return {};
  }

  const event = { ...eventPreview };
  const payload = (eventPreview as any).payload ?? (eventPreview as any).data ?? eventPreview;
  const metadata = (eventPreview as any).metadata ?? {};

  const context: Record<string, unknown> = {
    event,
    data: typeof payload === 'object' && payload !== null ? payload : {},
    metadata: typeof metadata === 'object' && metadata !== null ? metadata : {},
  };

  const order = (payload as any)?.order ?? (eventPreview as any)?.order;
  if (order && typeof order === 'object') {
    context.order = order;
  }

  const customer = (payload as any)?.customer ?? (eventPreview as any)?.customer;
  if (customer && typeof customer === 'object') {
    context.customer = customer;
  }

  return context;
};

type RecipientPreviewProps = {
  context: Record<string, unknown>;
  path?: string | null;
  fallback?: string | null;
  messageTemplate: string;
  availableFields: string[];
  onPickPath?: (field: string) => void;
};

const RecipientPreview = ({ context, path, fallback, messageTemplate, availableFields, onPickPath }: RecipientPreviewProps) => {
  const resolved = (path ? getDeepValue(context, path) : undefined) ?? undefined;
  const value = typeof resolved === 'string' && resolved.trim() ? resolved.trim() : undefined;
  const usedFallback = !value && fallback ? fallback.trim() : undefined;
  const finalRecipient = value || usedFallback || '';

  const renderedMessage = useMemo(() => {
    if (!messageTemplate) return '';
    return messageTemplate.replace(/{{\s*([^}]+)\s*}}/g, (_match, rawPath) => {
      const lookup = String(rawPath).trim();
      const actual = getDeepValue(context, lookup);
      if (actual === undefined || actual === null) return '';
      return String(actual);
    });
  }, [context, messageTemplate]);

  return (
    <div className="space-y-2 rounded-lg bg-muted/40 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview</p>
        {path ? (
          <code className="rounded bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">{path}</code>
        ) : (
          <span className="text-[10px] text-muted-foreground">No path selected</span>
        )}
      </div>
      <div className="rounded border bg-background px-3 py-2 text-sm">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Recipient</p>
        <p className="text-sm font-medium text-foreground">
          {finalRecipient || '—'}
        </p>
        {usedFallback && !value && (
          <p className="text-[11px] text-muted-foreground">Using fallback: {usedFallback}</p>
        )}
        {!finalRecipient && (
          <p className="text-[11px] text-destructive">Value is empty — message will be skipped.</p>
        )}
      </div>
      {messageTemplate && (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Message preview</p>
          <div className="rounded border bg-background px-3 py-2 text-sm whitespace-pre-wrap break-words">
            {renderedMessage || 'Message will be empty'}
          </div>
        </div>
      )}
      {availableFields.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Available fields</p>
          <div className="flex flex-wrap gap-1">
            {availableFields.slice(0, 30).map((field) => (
              <button
                key={field}
                type="button"
                className="rounded-full bg-background px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted transition-colors"
                title="Click to copy path and set as recipient"
                onClick={async () => {
                  try {
                    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                      await navigator.clipboard.writeText(field);
                    }
                  } catch {}
                  if (onPickPath) onPickPath(field);
                }}
              >
                {field}
              </button>
            ))}
            {availableFields.length > 30 && (
              <span className="text-[11px] text-muted-foreground">+{availableFields.length - 30} more</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const webhookMethodOptions: { value: WebhookMethod; label: string }[] = [
  { value: 'POST', label: 'POST' },
  { value: 'GET', label: 'GET' },
];

const statusOptions: { value: FlowStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'On' },
  { value: 'paused', label: 'Off' },
];

const convertMinutesToUnit = (minutes: number, unit: WaitUnit): number => {
  const base = Number.isFinite(minutes) ? minutes : 0;
  switch (unit) {
    case 'hours':
      return Math.round((base / 60) * 100) / 100;
    case 'days':
      return Math.round((base / 1440) * 100) / 100;
    default:
      return Math.round(base * 100) / 100;
  }
};

const convertUnitToMinutes = (value: number, unit: WaitUnit): number => {
  const sanitized = Number.isFinite(value) ? value : 0;
  switch (unit) {
    case 'hours':
      return Math.max(0, Math.round(sanitized * 60));
    case 'days':
      return Math.max(0, Math.round(sanitized * 1440));
    default:
      return Math.max(0, Math.round(sanitized));
  }
};

const CUSTOM_MESSAGE_PLACEHOLDER = 'Hi {{name}}, you left a few items in your cart. Complete your purchase here: {{cta_url}}';

const formatDateTime = (iso?: string): string => {
  if (!iso) return 'Never';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const palette: Record<Exclude<PaletteNodeKey, 'start'>, {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  defaultData: Partial<AutomationNodeData>;
}> = {
  wait: {
    title: 'Wait',
    description: 'Pause the journey for minutes or hours.',
    icon: Clock,
    accent: 'bg-blue-500/10 text-blue-400',
    defaultData: { waitMinutes: 120, waitUnit: 'minutes', skipWeekends: false, label: 'Wait 2 hours' },
  },
  message: {
    title: 'Send Message',
    description: 'Trigger WhatsApp or email outreach.',
    icon: MessageCircle,
    accent: 'bg-emerald-500/10 text-emerald-400',
    defaultData: {
      channel: 'whatsapp',
      messageTemplateId: 'payment_reminder',
      ctaUrl: '',
      sendFollowUp: true,
      customMessage: '',
      recipientPath: 'order.customer_phone',
      fallbackRecipient: '',
      eventFields: [],
      label: 'Send WhatsApp message',
    },
  },
  condition: {
    title: 'Condition',
    description: 'Branch based on customer data or cart status.',
    icon: GitBranch,
    accent: 'bg-amber-500/10 text-amber-400',
    defaultData: {
      condition: "cart.total > 0",
      conditionTrueLabel: 'If true',
      conditionFalseLabel: 'If false',
      conditionStrict: false,
      label: 'Check cart total',
    },
  },
  webhook: {
    title: 'Webhook',
    description: 'Call an external automation or n8n workflow.',
    icon: Globe,
    accent: 'bg-purple-500/10 text-purple-400',
    defaultData: {
      webhookUrl: 'https://your-service.example/webhook',
      webhookMethod: 'POST',
      webhookSecret: '',
      verifySSL: true,
      label: 'Invoke webhook',
    },
  },
  order: {
    title: 'Order event',
    description: 'Trigger when an order is created or updated.',
    icon: Workflow,
    accent: 'bg-sky-500/10 text-sky-400',
    defaultData: {
      orderTrigger: 'created',
      label: 'Order created',
      description: 'React to new orders automatically.',
    },
  },
  cart: {
    title: 'Abandoned cart',
    description: 'Recover customers who left items in their cart.',
    icon: ShoppingBag,
    accent: 'bg-rose-500/10 text-rose-400',
    defaultData: {
      cartTrigger: 'new_abandon',
      label: 'New abandoned cart',
      description: 'Start a series when a cart is abandoned.',
    },
  },
};

type FlowStatus = 'draft' | 'active' | 'paused';

type AutomationGraphPayload = {
  nodes?: Node[];
  edges?: Edge[];
};

type AutomationFlowRecord = {
  id: string;
  name: string;
  description?: string;
  status: FlowStatus;
  graph?: AutomationGraphPayload;
  created?: string;
  updated?: string;
};

type AutomationFlowPayload = {
  name: string;
  description?: string;
  status: FlowStatus;
  graph?: AutomationGraphPayload;
};

const NEW_FLOW_ID = 'new';

const parseGraphField = (raw: unknown): AutomationGraphPayload => {
  if (!raw) return { nodes: [], edges: [] };
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed as AutomationGraphPayload;
      }
    } catch {
      return { nodes: [], edges: [] };
    }
  }
  if (typeof raw === 'object') {
    const graph = raw as AutomationGraphPayload;
    return {
      nodes: Array.isArray(graph.nodes) ? graph.nodes : [],
      edges: Array.isArray(graph.edges) ? graph.edges : [],
    };
  }
  return { nodes: [], edges: [] };
};

const mapAutomationRecord = (record: RecordModel): AutomationFlowRecord => ({
  id: String(record.id),
  name: typeof record.name === 'string' && record.name.trim() ? record.name : 'Untitled journey',
  description: typeof record.description === 'string' ? record.description : '',
  status: (record.status as FlowStatus) ?? 'draft',
  graph: parseGraphField(record.graph),
  created: typeof record.created === 'string' ? record.created : undefined,
  updated: typeof record.updated === 'string' ? record.updated : undefined,
});

const sanitizeGraph = (graph?: AutomationGraphPayload): AutomationGraphPayload => {
  const fallback = { nodes: [], edges: [] };
  if (!graph) return fallback;
  try {
    return JSON.parse(JSON.stringify(graph)) as AutomationGraphPayload;
  } catch {
    return fallback;
  }
};

const extractData = (raw: unknown): AutomationNodeData => ({
  type: 'message',
  label: 'Step',
  ...(raw as Partial<AutomationNodeData>),
});

const StartNode = ({ data }: NodeProps) => {
  const nodeData = extractData(data);
  return (
    <div className="rounded-full bg-primary text-primary-foreground px-4 py-2 shadow-sm flex items-center gap-2">
      <Rocket className="h-4 w-4" />
      <div className="flex flex-col">
        <span className="font-medium text-sm">{nodeData.label}</span>
        {nodeData.activityEventLabel && (
          <span className="text-[11px] text-primary-foreground/80">
            {nodeData.activityEventLabel}
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-primary-foreground" />
    </div>
  );
};

const AutomationNodeComponent = ({ data, selected }: NodeProps) => {
  const nodeData = extractData(data);
  const Icon = palette[nodeData.type as Exclude<PaletteNodeKey, 'start'>]?.icon ?? MessageCircle;
  const accent = palette[nodeData.type as Exclude<PaletteNodeKey, 'start'>]?.accent ?? 'bg-muted text-foreground';

  return (
    <div
      className={cn(
        'rounded-xl border bg-card px-4 py-3 shadow-sm min-w-[180px] transition-all duration-150',
        selected ? 'ring-2 ring-primary border-primary/40' : 'border-border'
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn('h-10 w-10 rounded-full flex items-center justify-center', accent)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold leading-tight">{nodeData.label}</span>
          {nodeData.description && <span className="text-xs text-muted-foreground line-clamp-2">{nodeData.description}</span>}
        </div>
      </div>
      <Handle type="target" position={Position.Left} className="!bg-primary" />
      <Handle type="source" position={Position.Right} className="!bg-primary" />
    </div>
  );
};

const nodeTypes: NodeTypes = {
  start: StartNode,
  automation: AutomationNodeComponent,
};

const initialNodes: Node[] = [
  {
    id: 'start',
    position: { x: 100, y: 200 },
    type: 'start',
    data: {
      type: 'start',
      label: 'Journey start',
      activityEventKey: FALLBACK_ACTIVITY_OPTIONS[0]?.key,
      activityEventLabel: FALLBACK_ACTIVITY_OPTIONS[0]?.label,
      activityStage: FALLBACK_ACTIVITY_OPTIONS[0]?.stage,
    },
  },
  {
    id: 'wait-1',
    position: { x: 360, y: 200 },
    type: 'automation',
    data: {
      type: 'wait',
      label: 'Wait 2 hours',
      waitMinutes: 120,
      waitUnit: 'minutes',
      skipWeekends: false,
      description: 'Give the user some time before messaging.',
    },
  },
  {
    id: 'message-1',
    position: { x: 620, y: 200 },
    type: 'automation',
    data: {
      type: 'message',
      label: 'Send WhatsApp',
      channel: 'whatsapp',
      messageTemplateId: 'payment_reminder',
      ctaUrl: '',
      sendFollowUp: true,
      customMessage: '',
      recipientPath: 'order.customer_phone',
      fallbackRecipient: '',
      eventFields: [],
      description: 'Message the customer with payment link.',
    },
  },
  {
    id: 'cart-1',
    position: { x: 880, y: 200 },
    type: 'automation',
    data: {
      type: 'cart',
      label: 'Abandoned cart trigger',
      cartTrigger: 'new_abandon',
      description: 'Start a recovery journey when the cart is abandoned.',
    },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: 'start', target: 'wait-1', animated: true },
  { id: 'e2-3', source: 'wait-1', target: 'message-1', animated: true },
  { id: 'e3-4', source: 'message-1', target: 'cart-1', animated: true },
];

const AutomationPage = () => {
  const queryClient = useQueryClient();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [idCounter, setIdCounter] = useState(initialNodes.length + 1);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(initialNodes[1]?.id ?? null);
  const [selectedFlowId, setSelectedFlowId] = useState<string>(NEW_FLOW_ID);
  const [pageMode, setPageMode] = useState<'list' | 'builder'>('list');
  const [flowMeta, setFlowMeta] = useState<{ name: string; description: string; status: FlowStatus }>({
    name: 'New automation',
    description: '',
    status: 'draft',
  });
  const [activityOptions, setActivityOptions] = useState<ActivityEventOption[]>(FALLBACK_ACTIVITY_OPTIONS);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [apiBaseUrl, setApiBaseUrl] = useState<string | null>(null);
  const [apiDiscoveryError, setApiDiscoveryError] = useState<string | null>(null);
  const [liveActivities, setLiveActivities] = useState<LiveActivity[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [liveActivityError, setLiveActivityError] = useState<string | null>(null);
  const liveActivityIdsRef = useRef<Set<string>>(new Set());
  const livePollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const automationsQuery = useQuery<AutomationFlowRecord[], Error>({
    queryKey: ['automations'],
    queryFn: async () => {
      await ensureAdminAuth();
      try {
        const records = await pb.collection('automations').getFullList({ sort: '-updated' });
        return records.map(mapAutomationRecord);
      } catch (error) {
        const err = error as ClientResponseError;
        if (err?.status === 404) {
          console.warn('Automations collection not found in PocketBase. Showing empty list.');
          return [];
        }
        throw (error instanceof Error ? error : new Error('Failed to load automations'));
      }
    },
    retry: 1,
  });

  useEffect(() => {
    if (automationsQuery.error) {
      toast.error(automationsQuery.error.message || 'Failed to load automations');
    }
  }, [automationsQuery.error]);

  const flows = useMemo(() => automationsQuery.data ?? [], [automationsQuery.data]);
  const selectedFlow = selectedFlowId === NEW_FLOW_ID ? undefined : flows.find((flow) => flow.id === selectedFlowId);
  const isLoadingFlows = automationsQuery.isLoading || automationsQuery.isFetching;

  const loadActivityOptions = useCallback(async () => {
    setIsLoadingActivities(true);
    setActivityError(null);
    try {
      const events = await fetchRecentJourneyEvents(apiBaseUrl);
      const unique = new Map<string, ActivityEventOption>();
      events.forEach((evt) => {
        if (!evt?.event) return;
        const key = evt.event;
        if (unique.has(key)) return;
        unique.set(key, {
          key,
          label: formatActivityLabel(key),
          stage: evt.stage,
          description: evt.metadata?.description || undefined,
          example: evt,
        });
      });
      const merged = [...Array.from(unique.values())];
      // Ensure fallback events are present if missing
      FALLBACK_ACTIVITY_OPTIONS.forEach((fallback) => {
        if (!unique.has(fallback.key)) {
          merged.push({ ...fallback, example: null });
        }
      });
      merged.sort((a, b) => a.label.localeCompare(b.label));
      setActivityOptions(merged);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load journey events';
      console.warn('Activity load error:', message);
      setActivityError('Could not load recent activity events. Showing defaults.');
      setActivityOptions(FALLBACK_ACTIVITY_OPTIONS);
    } finally {
      setIsLoadingActivities(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    loadActivityOptions();
  }, [loadActivityOptions]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const detected = await discoverApiBaseUrl();
      if (!mounted) return;
      setApiBaseUrl(detected);
      if (!detected) setApiDiscoveryError('Could not detect API origin; using same-origin /api.');
    })();
    return () => { mounted = false; };
  }, []);

  const applyGraph = useCallback((graph?: AutomationGraphPayload) => {
    const baseNodes = Array.isArray(graph?.nodes) && graph.nodes?.length ? graph.nodes : initialNodes;
    const baseEdges = Array.isArray(graph?.edges) ? graph.edges : initialEdges;
    const clonedNodes = baseNodes.map((node) => ({
      ...node,
      data: { ...(node.data as Record<string, unknown>) },
      position: node.position ?? { x: 100, y: 200 },
    }));
    const clonedEdges = baseEdges.map((edge) => ({ ...edge }));
    setNodes(clonedNodes);
    setEdges(clonedEdges);
    setSelectedNodeId(clonedNodes[1]?.id ?? clonedNodes[0]?.id ?? null);
    setIdCounter(clonedNodes.length + 1);
  }, [setEdges, setNodes]);

  const handleCreateDraft = useCallback(() => {
    setSelectedFlowId(NEW_FLOW_ID);
    setFlowMeta({ name: 'New automation', description: '', status: 'draft' });
    applyGraph(undefined);
    setPageMode('builder');
    toast.info('Started a fresh automation draft.');
  }, [applyGraph]);

  const handleBackToList = useCallback(() => {
    setPageMode('list');
    setSelectedNodeId(null);
  }, []);

  useEffect(() => {
    if (pageMode !== 'builder') return;
    if (!selectedFlow) {
      setFlowMeta({ name: 'New automation', description: '', status: 'draft' });
      applyGraph(undefined);
      return;
    }
    setFlowMeta({
      name: selectedFlow.name || 'Untitled journey',
      description: selectedFlow.description || '',
      status: selectedFlow.status || 'draft',
    });
    applyGraph(selectedFlow.graph);
  }, [applyGraph, pageMode, selectedFlow, selectedFlowId]);

  useEffect(() => {
    if (pageMode === 'list' && flows.length > 0 && selectedFlowId === NEW_FLOW_ID) {
      setSelectedFlowId(flows[0].id);
    }
  }, [flows, pageMode, selectedFlowId]);

  const handleOpenExistingFlow = useCallback((flow: AutomationFlowRecord) => {
    setSelectedFlowId(flow.id);
    setFlowMeta({
      name: flow.name || 'Untitled journey',
      description: flow.description || '',
      status: flow.status || 'draft',
    });
    applyGraph(flow.graph);
    setPageMode('builder');
  }, [applyGraph]);

  const handleSelectFlow = useCallback((value: string) => {
    if (value === NEW_FLOW_ID) {
      handleCreateDraft();
    } else {
      const flow = flows.find((item) => item.id === value);
      if (flow) {
        handleOpenExistingFlow(flow);
      }
    }
  }, [flows, handleCreateDraft, handleOpenExistingFlow]);

  const mutationPayload = (meta: typeof flowMeta, graph: AutomationGraphPayload): AutomationFlowPayload => ({
    name: meta.name.trim() || 'Untitled journey',
    description: meta.description.trim(),
    status: meta.status,
    graph,
  });

  const createFlowMutation = useMutation<AutomationFlowRecord, Error, AutomationFlowPayload>({
    mutationFn: async (payload) => {
      await ensureAdminAuth();
      try {
        const created = await pb.collection('automations').create({
          name: payload.name,
          description: payload.description ?? '',
          status: payload.status,
          graph: sanitizeGraph(payload.graph),
        });
        return mapAutomationRecord(created as RecordModel);
      } catch (error) {
        const err = error as ClientResponseError;
        throw new Error(err?.message || 'Failed to create automation');
      }
    },
    onSuccess: (created) => {
      toast.success('Automation saved.');
      setSelectedFlowId(created.id);
      queryClient.invalidateQueries({ queryKey: ['automations'] });
    },
    onError: (error) => toast.error(error.message || 'Failed to create automation'),
  });

  const duplicateFlowMutation = useMutation<AutomationFlowRecord, Error, AutomationFlowRecord>({
    mutationFn: async (flow) => {
      await ensureAdminAuth();
      const payload: AutomationFlowPayload = {
        name: `${flow.name} copy`,
        description: flow.description ?? '',
        status: 'draft',
        graph: flow.graph,
      };
      const created = await pb.collection('automations').create({
        name: payload.name,
        description: payload.description,
        status: payload.status,
        graph: sanitizeGraph(payload.graph),
      });
      return mapAutomationRecord(created as RecordModel);
    },
    onSuccess: (created) => {
      toast.success('Automation duplicated.');
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      setSelectedFlowId(created.id);
      setPageMode('builder');
    },
    onError: (error) => toast.error(error.message || 'Failed to duplicate automation'),
  });

  const deleteFlowMutation = useMutation<void, Error, string>({
    mutationFn: async (flowId) => {
      await ensureAdminAuth();
      await pb.collection('automations').delete(flowId);
    },
    onSuccess: (_, flowId) => {
      toast.success('Automation deleted.');
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      if (selectedFlowId === flowId) {
        setSelectedFlowId(NEW_FLOW_ID);
        setPageMode('list');
      }
    },
    onError: (error) => toast.error(error.message || 'Failed to delete automation'),
  });

  const updateFlowMutation = useMutation<AutomationFlowRecord, Error, { id: string; payload: AutomationFlowPayload }>({
    mutationFn: async ({ id, payload }) => {
      await ensureAdminAuth();
      try {
        const updated = await pb.collection('automations').update(id, {
          name: payload.name,
          description: payload.description ?? '',
          status: payload.status,
          graph: sanitizeGraph(payload.graph),
        });
        return mapAutomationRecord(updated as RecordModel);
      } catch (error) {
        const err = error as ClientResponseError;
        throw new Error(err?.message || 'Failed to update automation');
      }
    },
    onSuccess: (updated) => {
      toast.success('Automation updated.');
      setFlowMeta({
        name: updated.name || 'Untitled journey',
        description: updated.description || '',
        status: updated.status || 'draft',
      });
      queryClient.invalidateQueries({ queryKey: ['automations'] });
    },
    onError: (error) => toast.error(error.message || 'Failed to update automation'),
  });

  const isSaving = createFlowMutation.isPending || updateFlowMutation.isPending;
  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId) ?? null, [nodes, selectedNodeId]);
  const selectedNodeData = useMemo(() => (selectedNode ? extractData(selectedNode.data) : null), [selectedNode]);
  const selectedNodePreviewContext = useMemo(() => {
    if (!selectedNodeData?.activityPreview) return {};
    return buildPreviewContext(selectedNodeData.activityPreview);
  }, [selectedNodeData?.activityPreview]);
  const selectedNodePreviewFields = useMemo(() => collectPlaceholderPaths(selectedNodePreviewContext), [selectedNodePreviewContext]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, animated: true }, eds));
    },
    [setEdges]
  );

  const handleSelectionChange = useCallback((params: OnSelectionChangeParams) => {
    if (params.nodes.length > 0) {
      setSelectedNodeId(params.nodes[0].id);
    } else {
      setSelectedNodeId(null);
    }
  }, []);

  const handleAddNode = useCallback(
    (key: Exclude<PaletteNodeKey, 'start'>) => {
      setNodes((current) => {
        const id = `${key}-${idCounter}`;
        const spacing = 160;
        const newNode: Node = {
          id,
          type: 'automation',
          position: {
            x: 240 + (current.length % 3) * spacing,
            y: 120 + Math.floor(current.length / 3) * spacing,
          },
          data: {
            type: key,
            label: palette[key].defaultData.label ?? palette[key].title,
            description: palette[key].description,
            ...palette[key].defaultData,
          },
        };
        return [...current, newNode];
      });
      setSelectedNodeId(`${key}-${idCounter}`);
      setIdCounter((val) => val + 1);
      toast.success(`${palette[key].title} added to canvas`);
    },
    [idCounter, setNodes]
  );

  const handleReset = useCallback(() => {
    if (selectedFlow) {
      applyGraph(selectedFlow.graph);
      toast.info('Reverted to last saved version.');
    } else {
      applyGraph();
      toast.info('Journey reset to starter flow.');
    }
  }, [applyGraph, selectedFlow]);

  const flowGraphPayload = useMemo<AutomationGraphPayload>(() => ({
    nodes: nodes.map((node) => ({ ...node, data: { ...(node.data as Record<string, unknown>) } })),
    edges: edges.map((edge) => ({ ...edge })),
  }), [edges, nodes]);

  const handleSave = (statusOverride?: FlowStatus) => {
    const nextMeta = statusOverride ? { ...flowMeta, status: statusOverride } : flowMeta;
    const name = nextMeta.name.trim();
    if (!name) {
      toast.error('Give this automation a name.');
      return;
    }
    const payload = mutationPayload(nextMeta, flowGraphPayload);
    if (statusOverride) {
      setFlowMeta(nextMeta);
    }
    if (selectedFlowId === NEW_FLOW_ID) {
      createFlowMutation.mutate(payload);
    } else {
      updateFlowMutation.mutate({ id: selectedFlowId, payload });
    }
  };

  const handleNodeDataChange = useCallback(
    (nodeId: string, changes: Partial<AutomationNodeData>) => {
      setNodes((current) =>
        current.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: { ...(node.data as Record<string, unknown>), ...changes },
              }
            : node
        )
      );
    },
    [setNodes]
  );

  const handleSelectActivity = useCallback(
    (nodeId: string, option: ActivityEventOption | undefined) => {
      if (!option) return;
      handleNodeDataChange(nodeId, {
        activityEventKey: option.key,
        activityEventLabel: option.label,
        activityStage: option.stage,
        activityPreview: option.example || undefined,
      });
    },
    [handleNodeDataChange]
  );

  const handleDeleteNode = useCallback(() => {
    if (!selectedNodeId) return;
    if (selectedNodeId === 'start') {
      toast.warning('Start node cannot be deleted.');
      return;
    }
    setNodes((current) => current.filter((node) => node.id !== selectedNodeId));
    setEdges((current) => current.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId));
    setSelectedNodeId(null);
  }, [selectedNodeId, setEdges, setNodes]);

  const flowJson = useMemo(() => ({
    id: selectedFlow?.id ?? NEW_FLOW_ID,
    name: flowMeta.name,
    description: flowMeta.description,
    status: flowMeta.status,
    graph: flowGraphPayload,
  }), [flowGraphPayload, flowMeta.description, flowMeta.name, flowMeta.status, selectedFlow?.id]);

  const handleDuplicateFlow = useCallback((flow: AutomationFlowRecord) => {
    duplicateFlowMutation.mutate(flow);
  }, [duplicateFlowMutation]);

  const handleDeleteFlow = useCallback((id: string) => {
    deleteFlowMutation.mutate(id);
  }, [deleteFlowMutation]);

  const isMutatingList = duplicateFlowMutation.isPending || deleteFlowMutation.isPending;

  const handleUseLiveActivity = useCallback((entry: LiveActivity) => {
    const label = formatActivityLabel(entry.event);
    const preview = (entry.payload as unknown) as Record<string, unknown> | undefined;
    setNodes((current) =>
      current.map((node) =>
        node.id === 'start'
          ? {
              ...node,
              data: {
                ...(node.data as Record<string, unknown>),
                type: 'start',
                label: (extractData(node.data).label || 'Journey start'),
                activityEventKey: entry.event,
                activityEventLabel: label,
                activityStage: entry.stage,
                activityPreview: preview,
              },
            }
          : node
      )
    );
    setSelectedNodeId('start');
    toast.success(`Using ${label} as journey trigger`);
  }, [setNodes]);

  const pushLiveActivities = useCallback((events: JourneyEvent[]) => {
    setLiveActivities((prev) => {
      const ids = liveActivityIdsRef.current;
      const nextEntries: LiveActivity[] = [...prev];
      events.forEach((evt) => {
        const id = evt.id ?? `${evt.event ?? 'event'}-${evt.timestamp ?? Date.now()}`;
        if (!id || ids.has(id)) return;
        const payloadContext = buildPreviewContext(evt as Record<string, unknown>);
        const entry: LiveActivity = {
          id,
          event: evt.event ?? 'unknown.event',
          capturedAt: evt.timestamp ?? new Date().toISOString(),
          stage: evt.stage,
          status: 'captured',
          payload: {
            ...evt,
            payload: payloadContext.data as Record<string, unknown>,
          },
        };
        ids.add(id);
        nextEntries.unshift(entry);
      });
      return nextEntries.slice(0, 10);
    });
  }, []);

  const loadRecentActivitySnapshot = useCallback(async () => {
    try {
      const events = await fetchRecentJourneyEvents(apiBaseUrl);
      pushLiveActivities(events.slice(0, 5));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch journey snapshot';
      setLiveActivityError(message);
    }
  }, [apiBaseUrl, pushLiveActivities]);

  const stopListening = useCallback(() => {
    setIsListening(false);
    if (livePollRef.current) {
      clearInterval(livePollRef.current);
      livePollRef.current = null;
    }
  }, []);

  const pollRecentEvents = useCallback(async () => {
    try {
      const events = await fetchRecentJourneyEvents(apiBaseUrl);
      pushLiveActivities(events);
      setLiveActivityError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch live journey events';
      setLiveActivityError(message);
    }
  }, [apiBaseUrl, pushLiveActivities]);

  const startListening = useCallback(async () => {
    if (isListening) return;
    setIsListening(true);
    liveActivityIdsRef.current.clear();
    setLiveActivities([]);
    await loadRecentActivitySnapshot();
    if (livePollRef.current) {
      clearInterval(livePollRef.current);
    }
    livePollRef.current = setInterval(() => {
      pollRecentEvents();
    }, 5000);
  }, [isListening, loadRecentActivitySnapshot, pollRecentEvents]);

  useEffect(() => {
    return () => {
      if (livePollRef.current) {
        clearInterval(livePollRef.current);
        livePollRef.current = null;
      }
    };
  }, []);

  if (pageMode === 'list') {
    return (
      <AdminLayout>
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Automations</h1>
              <p className="text-sm text-muted-foreground">Create and manage journeys that recover carts, nurture leads, and notify customers.</p>
            </div>
            <Button onClick={handleCreateDraft} className="gap-2">
              <PlusCircle className="h-4 w-4" /> Create automation
            </Button>
          </div>

          {/* Webhook URL Card */}
          <Card className="border bg-card">
            <div className="px-4 py-3 border-b flex items-center gap-3">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Automation Webhook</span>
            </div>
            <div className="p-4 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Webhook URL
                </label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value="http://localhost:3001/api/automations/webhook"
                    className="font-mono text-sm bg-muted/50"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText('http://localhost:3001/api/automations/webhook');
                      toast.success('Webhook URL copied to clipboard');
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Send POST requests to this URL from your existing webhook system. The automation will trigger based on the event type in the payload.
              </p>
              <div className="text-xs text-muted-foreground space-y-1 bg-muted/30 rounded-md p-3">
                <p className="font-semibold">Example payload:</p>
                <pre className="font-mono text-[11px] overflow-x-auto">
{`{
  "type": "order.created",
  "data": {
    "order_id": "abc123",
    "customer_phone": "919876543210"
  }
}`}
                </pre>
              </div>
            </div>
          </Card>

          <Card className="border bg-card">
            <div className="px-4 py-3 border-b flex items-center gap-3">
              <Badge variant="secondary" className="uppercase">Library</Badge>
              {isLoadingFlows && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              {isMutatingList && <Badge variant="outline" className="gap-1 text-xs"><Loader2 className="h-3 w-3 animate-spin" /> Syncing…</Badge>}
            </div>
            <div className="p-4 space-y-4">
              {flows.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <Workflow className="h-10 w-10 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-lg font-medium">No automations yet</p>
                    <p className="text-sm text-muted-foreground">Spin up your first journey to win back carts, nudge for payments, or send webhooks.</p>
                  </div>
                  <Button onClick={handleCreateDraft} className="gap-2">
                    <PlusCircle className="h-4 w-4" /> Start building
                  </Button>
                </div>
              )}

              {flows.length > 0 && (
                <div className="grid gap-4 lg:grid-cols-2">
                  {flows.map((flow) => (
                    <Card key={flow.id} className="border bg-background/80 backdrop-blur">
                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-base font-semibold">{flow.name || 'Untitled journey'}</span>
                              <Badge variant="outline" className="capitalize text-xs">{flow.status ?? 'draft'}</Badge>
                            </div>
                            {flow.description && <p className="text-sm text-muted-foreground line-clamp-2">{flow.description}</p>}
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="icon" onClick={() => handleDuplicateFlow(flow)} disabled={isMutatingList}>
                              <Workflow className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteFlow(flow.id)} disabled={isMutatingList}>
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Updated {formatDateTime(flow.updated)}</span>
                          <span>Created {formatDateTime(flow.created)}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary" className="text-[11px]">Steps {Array.isArray(flow.graph?.nodes) ? flow.graph?.nodes?.length ?? 0 : 0}</Badge>
                          <Badge variant="secondary" className="text-[11px]">Connections {Array.isArray(flow.graph?.edges) ? flow.graph?.edges?.length ?? 0 : 0}</Badge>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button size="sm" className="gap-2" onClick={() => handleOpenExistingFlow(flow)}>
                            <Workflow className="h-4 w-4" /> Open builder
                          </Button>
                          <Button size="sm" variant="outline" className="gap-2" onClick={() => handleDuplicateFlow(flow)} disabled={isMutatingList}>
                            <PlusCircle className="h-4 w-4" /> Duplicate
                          </Button>
                          <Button size="sm" variant="ghost" className="ml-auto text-muted-foreground" onClick={() => handleOpenExistingFlow(flow)}>
                            View details
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handleBackToList} className="text-muted-foreground h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Workflow className="h-5 w-5 text-primary" />
              <div>
                <h1 className="text-lg font-semibold">Automation Builder</h1>
                <p className="text-xs text-muted-foreground">Design customer journeys with waits, messages, and webhooks.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset} className="gap-1 h-8 px-3">
                <Pause className="h-3.5 w-3.5" /> Reset
              </Button>
              <Button onClick={() => handleSave('draft')} className="gap-1 h-8 px-3" disabled={isSaving}>
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save
              </Button>
              <Button
                variant="secondary"
                className="gap-1 h-8 px-3"
                onClick={() => handleSave('active')}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                Publish
              </Button>
            </div>
          </div>
        </div>

        <Card className="rounded-2xl border bg-card shadow-sm">
          <div className="px-3 py-3 space-y-3">
            {/* Automation selector removed per request */}

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Automation name</span>
              <Input
                value={flowMeta.name}
                onChange={(e) => setFlowMeta((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Automation name"
                className="flex-1 h-8 py-0"
              />
              <div className="flex items-center gap-1.5">
                {statusOptions.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={flowMeta.status === option.value ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 px-3"
                    onClick={() => setFlowMeta((prev) => ({ ...prev, status: option.value }))}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_320px] h-[calc(100vh-200px)]">
          {/* Palette + Live activity */}
          <div className="rounded-2xl border bg-card shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Test an event</p>
                <p className="text-xs text-muted-foreground">{isListening ? 'Listening for activity…' : 'Capture a recent checkout, payment, or cart event.'}</p>
              </div>
              <div className="flex items-center gap-2">
                {!isListening ? (
                  <Button size="sm" onClick={startListening} className="h-7 px-2 gap-1">
                    <Activity className="h-3.5 w-3.5" /> Listen
                  </Button>
                ) : (
                  <Button size="sm" variant="destructive" onClick={stopListening} className="h-7 px-2 gap-1">
                    <CircleStop className="h-3.5 w-3.5" /> Stop
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={loadRecentActivitySnapshot} className="h-7 px-2" title="Fetch latest">
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="px-3 py-3 border-b space-y-2">
              {liveActivityError && (
                <div className="flex items-center gap-2 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5" /> {liveActivityError}
                </div>
              )}
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>API: {apiBaseUrl || 'same-origin'}</span>
                {apiDiscoveryError && <span className="text-destructive/80">{apiDiscoveryError}</span>}
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Captured: {liveActivities.length}</span>
                <span>Last: {liveActivities[0] ? new Date(liveActivities[0].capturedAt).toLocaleTimeString() : '—'}</span>
              </div>
              <div className="space-y-2 max-h-40 overflow-auto pr-1">
                {liveActivities.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No recent events yet.</p>
                ) : (
                  liveActivities.slice(0, 5).map((item) => (
                    <div key={item.id} className="rounded-lg border px-2.5 py-2 text-xs bg-background/60">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{formatActivityLabel(item.event)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button size="sm" className="h-6 px-2 text-[11px]" onClick={() => handleUseLiveActivity(item)}>Use</Button>
                        </div>
                      </div>
                      <details className="mt-1">
                        <summary className="cursor-pointer text-[11px] text-muted-foreground">Preview</summary>
                        <pre className="mt-1 max-h-28 overflow-auto rounded bg-muted/40 p-2">{JSON.stringify(item.payload, null, 2)}</pre>
                      </details>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="px-4 py-3 border-b">
              <p className="text-sm font-semibold">Step library</p>
              <p className="text-xs text-muted-foreground">Drag actions onto the canvas to build the journey.</p>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
              {Object.entries(palette).map(([key, value]) => {
                const Icon = value.icon;
                return (
                  <Card
                    key={key}
                    className="border-muted-foreground/10 hover:border-primary/40 hover:shadow-lg transition-all duration-150 cursor-pointer"
                    onClick={() => handleAddNode(key as Exclude<PaletteNodeKey, 'start'>)}
                  >
                    <div className="flex items-start gap-3 p-4">
                      <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center', value.accent)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{value.title}</span>
                          <Badge variant="secondary" className="uppercase tracking-tight text-[10px]">Action</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{value.description}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Canvas */}
          <div className="rounded-2xl border bg-background shadow-inner overflow-hidden">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onSelectionChange={handleSelectionChange}
              onConnect={onConnect}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              proOptions={{ hideAttribution: true }}
            >
              <Background gap={24} size={1} className="!bg-gradient-to-br !from-muted/40 !via-background !to-muted/40" />
              <MiniMap className="!bg-background/90 backdrop-blur" />
              <Controls />
              <Panel position="bottom-left" className="rounded-full bg-background/80 backdrop-blur px-3 py-1 text-xs text-muted-foreground">
                Tip: select a node to configure it on the right.
              </Panel>
            </ReactFlow>
          </div>

          {/* Inspector */}
          <div className="rounded-2xl border bg-card shadow-sm flex flex-col">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Step settings</p>
                <p className="text-xs text-muted-foreground">Adjust details for the selected node.</p>
              </div>
              <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={handleDeleteNode}>
                <Trash className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {selectedNode && selectedNodeData ? (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Label</label>
                      <Input
                        value={selectedNodeData.label}
                        onChange={(e) => handleNodeDataChange(selectedNode.id, { label: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</label>
                      <Textarea
                        value={selectedNodeData.description ?? ''}
                        onChange={(e) => handleNodeDataChange(selectedNode.id, { description: e.target.value })}
                        rows={3}
                        placeholder="Add a short note so teammates understand this step."
                      />
                    </div>
                  </div>

                  {(selectedNodeData.type === 'start' || selectedNodeData.type === 'order' || selectedNodeData.type === 'cart') && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Trigger activity
                        </label>
                        <Select
                          value={selectedNodeData.activityEventKey ?? ''}
                          onValueChange={(value) => {
                            const option = activityOptions.find((opt) => opt.key === value);
                            handleSelectActivity(selectedNode.id, option ?? FALLBACK_ACTIVITY_OPTIONS.find((opt) => opt.key === value));
                          }}
                        >
                          <SelectTrigger disabled={isLoadingActivities}>
                            <SelectValue placeholder={isLoadingActivities ? 'Loading…' : 'Choose an event'} />
                          </SelectTrigger>
                          <SelectContent>
                            {activityOptions.map((option) => (
                              <SelectItem key={option.key} value={option.key}>
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">{option.label}</span>
                                  {option.stage && (
                                    <span className="text-[11px] text-muted-foreground">Stage: {formatActivityLabel(option.stage)}</span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {activityError && (
                          <p className="text-[11px] text-destructive">{activityError}</p>
                        )}
                        <p className="text-[11px] text-muted-foreground">
                          When this event arrives via the activity webhook, downstream nodes can use its data (customer, cart, order).
                        </p>
                      </div>

                      {selectedNodeData.activityPreview && (
                        <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
                          <p className="font-semibold text-muted-foreground">Sample payload</p>
                          <pre className="max-h-40 overflow-auto whitespace-pre-wrap">
                            {JSON.stringify(selectedNodeData.activityPreview, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedNodeData.type === 'wait' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Delay</label>
                          <Input
                            type="number"
                            min={0}
                            step={selectedNodeData.waitUnit === 'minutes' ? 5 : 0.25}
                            value={convertMinutesToUnit(selectedNodeData.waitMinutes ?? 0, selectedNodeData.waitUnit ?? 'minutes')}
                            onChange={(e) => {
                              const raw = Number.parseFloat(e.target.value);
                              const minutes = convertUnitToMinutes(raw, selectedNodeData.waitUnit ?? 'minutes');
                              handleNodeDataChange(selectedNode.id, { waitMinutes: minutes });
                            }}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Unit</label>
                          <Select
                            value={selectedNodeData.waitUnit ?? 'minutes'}
                            onValueChange={(value) => handleNodeDataChange(selectedNode.id, { waitUnit: value as WaitUnit })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {waitUnitOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium">{option.label}</span>
                                    <span className="text-xs text-muted-foreground">{option.helper}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Skip weekends</p>
                          <p className="text-[11px] text-muted-foreground">Avoid sending messages on Saturdays and Sundays.</p>
                        </div>
                        <Switch
                          checked={Boolean(selectedNodeData.skipWeekends)}
                          onCheckedChange={(checked) => handleNodeDataChange(selectedNode.id, { skipWeekends: checked })}
                        />
                      </div>
                    </div>
                  )}

                  {selectedNodeData.type === 'message' && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Channel</label>
                        <Select
                          value={selectedNodeData.channel ?? 'whatsapp'}
                          onValueChange={(value) => handleNodeDataChange(selectedNode.id, { channel: value as MessageChannel })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {channelOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">{option.label}</span>
                                  <span className="text-xs text-muted-foreground">{option.helper}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Template</label>
                        <Select
                          value={selectedNodeData.messageTemplateId ?? 'payment_reminder'}
                          onValueChange={(value) => handleNodeDataChange(selectedNode.id, { messageTemplateId: value as MessageTemplateId })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {messageTemplates.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedNodeData.messageTemplateId === 'custom' && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Custom message</label>
                          <Textarea
                            rows={4}
                            value={selectedNodeData.customMessage ?? ''}
                            onChange={(e) => handleNodeDataChange(selectedNode.id, { customMessage: e.target.value })}
                            placeholder={CUSTOM_MESSAGE_PLACEHOLDER}
                          />
                          <p className="text-[11px] text-muted-foreground">Supports liquid-style placeholders like {'{{name}}'} or {'{{order_id}}'}.</p>
                        </div>
                      )}

                      {(selectedNodeData.channel === 'whatsapp' || selectedNodeData.channel === 'sms' || selectedNodeData.channel === 'email') && (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Call-to-action link</label>
                            <Input
                              type="url"
                              value={selectedNodeData.ctaUrl ?? ''}
                              onChange={(e) => handleNodeDataChange(selectedNode.id, { ctaUrl: e.target.value })}
                              placeholder="https://yourstore.com/checkout"
                            />
                          </div>

                          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                            <div className="space-y-0.5">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Send follow-up</p>
                              <p className="text-[11px] text-muted-foreground">Automatically queue another reminder if there is no response.</p>
                            </div>
                            <Switch
                              checked={Boolean(selectedNodeData.sendFollowUp)}
                              onCheckedChange={(checked) => handleNodeDataChange(selectedNode.id, { sendFollowUp: checked })}
                            />
                          </div>
                        </>
                      )}

                      {(selectedNodeData.channel === 'evolution_text' || selectedNodeData.channel === 'evolution_media') && (
                        <div className="space-y-3 rounded-lg border px-3 py-3">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Send to</label>
                            <Select
                              value={(() => {
                                const current = selectedNodeData.recipientPath ?? '';
                                const known = RECIPIENT_PATH_OPTIONS.find((option) => option.value === current);
                                if (known) return known.value;
                                if (current) return CUSTOM_RECIPIENT_OPTION;
                                return 'order.customer_phone';
                              })()}
                              onValueChange={(value) => {
                                if (value === CUSTOM_RECIPIENT_OPTION) {
                                  handleNodeDataChange(selectedNode.id, {
                                    recipientPath: selectedNodeData.recipientPath ?? '',
                                  });
                                  return;
                                }
                                handleNodeDataChange(selectedNode.id, {
                                  recipientPath: value,
                                });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Choose where to read the phone number" />
                              </SelectTrigger>
                              <SelectContent>
                                {RECIPIENT_PATH_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    <div className="flex flex-col">
                                      <span className="text-sm font-medium">{option.label}</span>
                                      <span className="text-[11px] text-muted-foreground">
                                        {option.helper}
                                        {(() => {
                                          const sample = formatSampleValue(getDeepValue(selectedNodePreviewContext, option.value));
                                          return sample ? ` • e.g. ${sample}` : '';
                                        })()}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                                <SelectItem value={CUSTOM_RECIPIENT_OPTION}>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium">Custom path</span>
                                    <span className="text-[11px] text-muted-foreground">Specify a JSON path manually.</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {!selectedNodeData.recipientPath || !RECIPIENT_PATH_OPTIONS.some((option) => option.value === selectedNodeData.recipientPath) ? (
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recipient path</label>
                              <Input
                                value={selectedNodeData.recipientPath ?? ''}
                                onChange={(e) => handleNodeDataChange(selectedNode.id, { recipientPath: e.target.value })}
                                placeholder="e.g. data.payload.customer_phone"
                              />
                              <p className="text-[11px] text-muted-foreground">Path is resolved against the event context (event, data, order, customer, metadata).</p>
                            </div>
                          ) : null}

                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fallback number</label>
                            <Input
                              value={selectedNodeData.fallbackRecipient ?? ''}
                              onChange={(e) => handleNodeDataChange(selectedNode.id, { fallbackRecipient: e.target.value })}
                              placeholder="e.g. +919876543210"
                            />
                            <p className="text-[11px] text-muted-foreground">Used when the selected path resolves to an empty value.</p>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Message text</label>
                            <Textarea
                              rows={3}
                              value={selectedNodeData.evolutionMessage?.text ?? ''}
                              onChange={(e) => handleNodeDataChange(selectedNode.id, {
                                evolutionMessage: {
                                  ...selectedNodeData.evolutionMessage,
                                  text: e.target.value,
                                },
                              })}
                              placeholder="Hey {{name}}, just nudging you about your order."
                            />
                          </div>
                          {selectedNodeData.channel === 'evolution_media' && (
                            <>
                              <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Media URL</label>
                                <Input
                                  type="url"
                                  value={selectedNodeData.evolutionMessage?.mediaUrl ?? ''}
                                  onChange={(e) => handleNodeDataChange(selectedNode.id, {
                                    evolutionMessage: {
                                      ...selectedNodeData.evolutionMessage,
                                      mediaUrl: e.target.value,
                                    },
                                  })}
                                  placeholder="https://cdn.example.com/promo.jpg"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Media type</label>
                                  <Select
                                    value={selectedNodeData.evolutionMessage?.mediaType ?? 'image'}
                                    onValueChange={(value) => handleNodeDataChange(selectedNode.id, {
                                      evolutionMessage: {
                                        ...selectedNodeData.evolutionMessage,
                                        mediaType: value as 'image' | 'video' | 'audio' | 'document',
                                      },
                                    })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {['image', 'video', 'audio', 'document'].map((type) => (
                                        <SelectItem key={type} value={type} className="capitalize">
                                          {type}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Caption (optional)</label>
                                  <Input
                                    value={selectedNodeData.evolutionMessage?.caption ?? ''}
                                    onChange={(e) => handleNodeDataChange(selectedNode.id, {
                                      evolutionMessage: {
                                        ...selectedNodeData.evolutionMessage,
                                        caption: e.target.value,
                                      },
                                    })}
                                  />
                                </div>
                              </div>
                            </>
                          )}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Simulated send delay (ms)</label>
                            <Input
                              type="number"
                              min={0}
                              value={selectedNodeData.evolutionMessage?.delayMs ?? 0}
                              onChange={(e) => handleNodeDataChange(selectedNode.id, {
                                evolutionMessage: {
                                  ...selectedNodeData.evolutionMessage,
                                  delayMs: Number.parseInt(e.target.value, 10) || 0,
                                },
                              })}
                            />
                            <p className="text-[11px] text-muted-foreground">Optional artificial delay before sending through Evolution API.</p>
                          </div>

                          {selectedNodeData.activityPreview && (
                            <RecipientPreview
                              context={selectedNodePreviewContext}
                              path={selectedNodeData.recipientPath}
                              fallback={selectedNodeData.fallbackRecipient}
                              messageTemplate={selectedNodeData.evolutionMessage?.text ?? selectedNodeData.customMessage ?? ''}
                              availableFields={selectedNodePreviewFields}
                              onPickPath={(field) => handleNodeDataChange(selectedNode.id, { recipientPath: field })}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {selectedNodeData.type === 'condition' && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Expression</label>
                        <Textarea
                          rows={3}
                          value={selectedNodeData.condition ?? ''}
                          onChange={(e) => handleNodeDataChange(selectedNode.id, { condition: e.target.value })}
                          placeholder="order.total > 499 && order.payment_status === 'pending'"
                        />
                        <p className="text-[11px] text-muted-foreground">Use JSONLogic style expressions to branch journeys.</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">True branch label</label>
                          <Input
                            value={selectedNodeData.conditionTrueLabel ?? ''}
                            onChange={(e) => handleNodeDataChange(selectedNode.id, { conditionTrueLabel: e.target.value })}
                            placeholder="E.g. High intent"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">False branch label</label>
                          <Input
                            value={selectedNodeData.conditionFalseLabel ?? ''}
                            onChange={(e) => handleNodeDataChange(selectedNode.id, { conditionFalseLabel: e.target.value })}
                            placeholder="E.g. Nurture"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Strict comparison</p>
                          <p className="text-[11px] text-muted-foreground">Require exact equality when comparing strings or numbers.</p>
                        </div>
                        <Switch
                          checked={Boolean(selectedNodeData.conditionStrict)}
                          onCheckedChange={(checked) => handleNodeDataChange(selectedNode.id, { conditionStrict: checked })}
                        />
                      </div>
                    </div>
                  )}

                  {selectedNodeData.type === 'webhook' && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Endpoint URL</label>
                        <Input
                          type="url"
                          value={selectedNodeData.webhookUrl ?? ''}
                          onChange={(e) => handleNodeDataChange(selectedNode.id, { webhookUrl: e.target.value })}
                          placeholder="https://n8n.example/webhook/automation"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">HTTP method</label>
                          <Select
                            value={selectedNodeData.webhookMethod ?? 'POST'}
                            onValueChange={(value) => handleNodeDataChange(selectedNode.id, { webhookMethod: value as WebhookMethod })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {webhookMethodOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Secret (optional)</label>
                          <Input
                            value={selectedNodeData.webhookSecret ?? ''}
                            onChange={(e) => handleNodeDataChange(selectedNode.id, { webhookSecret: e.target.value })}
                            placeholder="Used to sign outgoing requests"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Verify SSL</p>
                          <p className="text-[11px] text-muted-foreground">Disable this only for internal/self-signed endpoints.</p>
                        </div>
                        <Switch
                          checked={selectedNodeData.verifySSL !== false}
                          onCheckedChange={(checked) => handleNodeDataChange(selectedNode.id, { verifySSL: checked })}
                        />
                      </div>
                    </div>
                  )}

                  <Separator />
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Last updated: just now</p>
                    <p>Node ID: {selectedNode.id}</p>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-sm text-muted-foreground gap-2">
                  <Workflow className="h-8 w-8" />
                  <p>Select a step to edit its configuration.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
};

export default AutomationPage;
