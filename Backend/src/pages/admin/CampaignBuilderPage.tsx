import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { pb } from '@/lib/pocketbase';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Loader2,
  MessageSquare,
  Play,
  Send,
  Settings,
  Users,
  Zap,
  FileText,
  Calendar,
  Phone,
  User,
  ShoppingBag,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  HelpCircle,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Types
interface Campaign {
  id?: string;
  name: string;
  channel: 'whatsapp';
  plugin_key: string;
  audience_preset: 'all' | 'last30d' | 'high_value' | 'winback' | 'custom';
  custom_filters: FilterRule[];
  audience_config: Record<string, unknown>;
  advanced_filter: string;
  scheduled_at: string | null;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'cancelled';
  message_template: string;
  max_per_minute: number;
}

interface CampaignSend {
  id: string;
  campaign: string;
  order: string;
  user: string | null;
  target_phone: string;
  target_name: string;
  status: 'queued' | 'sent' | 'failed';
  error: string | null;
  sent_at: string | null;
}

interface OrderRecord {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  total: number;
  totalAmount: number;
  status: string;
  payment_status: string;
  created: string;
  user?: string;
}

interface PluginRecord {
  id: string;
  key: string;
  name: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

// Filter rule for visual builder
interface FilterRule {
  id: string;
  field: string;
  operator: string;
  value: string;
}

// Available fields for filtering
const filterFields = [
  { value: 'payment_status', label: 'Payment Status', type: 'select', options: ['paid', 'pending', 'failed', 'refunded'] },
  { value: 'status', label: 'Order Status', type: 'select', options: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] },
  { value: 'total', label: 'Order Total (₹)', type: 'number' },
  { value: 'totalAmount', label: 'Total Amount (₹)', type: 'number' },
  { value: 'created', label: 'Order Date', type: 'date' },
  { value: 'customer_name', label: 'Customer Name', type: 'text' },
  { value: 'customer_email', label: 'Customer Email', type: 'text' },
];

// Operators by field type
const operatorsByType: Record<string, { value: string; label: string }[]> = {
  text: [
    { value: '~', label: 'Contains' },
    { value: '=', label: 'Equals' },
    { value: '!=', label: 'Not equals' },
  ],
  number: [
    { value: '>=', label: '≥ Greater or equal' },
    { value: '<=', label: '≤ Less or equal' },
    { value: '>', label: '> Greater than' },
    { value: '<', label: '< Less than' },
    { value: '=', label: '= Equals' },
  ],
  select: [
    { value: '=', label: 'Is' },
    { value: '!=', label: 'Is not' },
  ],
  date: [
    { value: '>=', label: 'On or after' },
    { value: '<=', label: 'On or before' },
    { value: '>', label: 'After' },
    { value: '<', label: 'Before' },
  ],
};

// Campaign message templates
const campaignTemplates = [
  {
    id: 'promo_broadcast',
    name: '🎉 Promo Broadcast',
    description: 'Announce a sale or discount',
    text: `🎉 *Special Offer for You!*

Hi {{order.customer_name}},

We have an exclusive offer just for you!

🛍️ Shop now and enjoy amazing discounts.

Thank you for being a valued customer!

– {{campaign.name}}`,
  },
  {
    id: 'winback',
    name: '💝 Winback',
    description: 'Re-engage inactive customers',
    text: `Hi {{order.customer_name}},

We miss you! 💝

It's been a while since your last order. Come back and check out what's new!

🎁 Use code COMEBACK10 for 10% off your next order.

– {{campaign.name}}`,
  },
  {
    id: 'new_arrival',
    name: '✨ New Arrival',
    description: 'Announce new products',
    text: `✨ *New Arrivals Alert!*

Hi {{order.customer_name}},

Fresh new products just dropped! Be the first to shop our latest collection.

🛒 Shop now before they're gone!

– {{campaign.name}}`,
  },
  {
    id: 'thank_you',
    name: '🙏 Thank You',
    description: 'Thank customers for their order',
    text: `🙏 *Thank You!*

Hi {{order.customer_name}},

Thank you for your recent order #{{order.id}}!

Total: ₹{{order.total}}

We appreciate your business and hope you love your purchase!

– {{campaign.name}}`,
  },
  {
    id: 'custom',
    name: '📝 Custom Message',
    description: 'Write your own message',
    text: `Hi {{order.customer_name}},

[Your message here]

– {{campaign.name}}`,
  },
];

// Variable tokens for insertion
const variableTokens = [
  { token: 'order.customer_name', label: 'Customer Name', icon: User },
  { token: 'order.customer_phone', label: 'Customer Phone', icon: Phone },
  { token: 'order.id', label: 'Order ID', icon: FileText },
  { token: 'order.total', label: 'Order Total', icon: ShoppingBag },
  { token: 'order.created', label: 'Order Date', icon: Calendar },
  { token: 'campaign.name', label: 'Campaign Name', icon: MessageSquare },
];

// Audience presets
const audiencePresets = [
  {
    value: 'all',
    label: 'All Customers',
    description: 'Everyone who has placed an order',
    filter: 'id != ""',
  },
  {
    value: 'last30d',
    label: 'Recent Customers',
    description: 'Ordered in the last 30 days',
    filter: '', // computed dynamically
  },
  {
    value: 'high_value',
    label: 'High Value Customers',
    description: 'Orders with total ≥ ₹2000',
    filter: 'total >= 2000 || totalAmount >= 2000',
  },
  {
    value: 'winback',
    label: 'Inactive Customers',
    description: 'No orders in last 60 days',
    filter: '', // computed dynamically
  },
  {
    value: 'custom',
    label: 'Custom Segment',
    description: 'Build your own filter with easy dropdowns',
    filter: '',
  },
];

// Steps
const steps = [
  { id: 1, name: 'Basics', icon: Settings },
  { id: 2, name: 'Audience', icon: Users },
  { id: 3, name: 'Message', icon: MessageSquare },
  { id: 4, name: 'Schedule', icon: Clock },
];

export default function CampaignBuilderPage() {
  const { toast } = useToast();
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  
  // Campaign state
  const [campaign, setCampaign] = useState<Campaign>({
    name: '',
    channel: 'whatsapp',
    plugin_key: '',
    audience_preset: 'all',
    custom_filters: [],
    audience_config: {},
    advanced_filter: '',
    scheduled_at: null,
    status: 'draft',
    message_template: campaignTemplates[0].text,
    max_per_minute: 20,
  });
  
  // Plugins
  const [plugins, setPlugins] = useState<PluginRecord[]>([]);
  const [loadingPlugins, setLoadingPlugins] = useState(true);
  
  // Audience preview
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [loadingAudience, setLoadingAudience] = useState(false);
  
  // Sending state
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [sendLogs, setSendLogs] = useState<CampaignSend[]>([]);
  const [sendStatus, setSendStatus] = useState<'idle' | 'running' | 'paused' | 'completed'>('idle');
  const [stopRequested, setStopRequested] = useState(false);
  
  // Schedule mode
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('09:00');
  
  // Load WhatsApp plugins
  useEffect(() => {
    async function loadPlugins() {
      try {
        const result = await pb.collection('plugins').getList(1, 50, {
          filter: 'key ~ "whatsapp" || key ~ "evolution"',
        });
        setPlugins(result.items as unknown as PluginRecord[]);
        if (result.items.length > 0) {
          setCampaign(prev => ({ ...prev, plugin_key: result.items[0].key }));
        }
      } catch (error) {
        console.error('Failed to load plugins:', error);
      } finally {
        setLoadingPlugins(false);
      }
    }
    loadPlugins();
  }, []);
  
  // Build filter string from visual rules
  const buildFilterFromRules = useCallback((rules: FilterRule[]): string => {
    if (rules.length === 0) return 'id != ""';
    
    const parts = rules.map(rule => {
      const field = filterFields.find(f => f.value === rule.field);
      if (!field || !rule.value) return null;
      
      if (field.type === 'text') {
        if (rule.operator === '~') {
          return `${rule.field} ~ "${rule.value}"`;
        }
        return `${rule.field} ${rule.operator} "${rule.value}"`;
      }
      
      if (field.type === 'select') {
        return `${rule.field} ${rule.operator} "${rule.value}"`;
      }
      
      if (field.type === 'number') {
        return `${rule.field} ${rule.operator} ${rule.value}`;
      }
      
      if (field.type === 'date') {
        return `${rule.field} ${rule.operator} "${rule.value}"`;
      }
      
      return null;
    }).filter(Boolean);
    
    return parts.length > 0 ? parts.join(' && ') : 'id != ""';
  }, []);
  
  // Compute audience filter
  const computeAudienceFilter = useCallback(() => {
    const now = new Date();
    const preset = audiencePresets.find(p => p.value === campaign.audience_preset);
    
    if (campaign.audience_preset === 'custom') {
      // Use visual filter builder rules
      if (campaign.custom_filters.length > 0) {
        return buildFilterFromRules(campaign.custom_filters);
      }
      return campaign.advanced_filter || 'id != ""';
    }
    
    if (campaign.audience_preset === 'last30d') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return `created >= "${thirtyDaysAgo.toISOString()}"`;
    }
    
    if (campaign.audience_preset === 'winback') {
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      return `created < "${sixtyDaysAgo.toISOString()}"`;
    }
    
    return preset?.filter || 'id != ""';
  }, [campaign.audience_preset, campaign.advanced_filter, campaign.custom_filters, buildFilterFromRules]);
  
  // Filter rule management
  const addFilterRule = useCallback(() => {
    const newRule: FilterRule = {
      id: `rule_${Date.now()}`,
      field: 'payment_status',
      operator: '=',
      value: '',
    };
    setCampaign(prev => ({
      ...prev,
      custom_filters: [...prev.custom_filters, newRule],
    }));
  }, []);
  
  const updateFilterRule = useCallback((ruleId: string, updates: Partial<FilterRule>) => {
    setCampaign(prev => ({
      ...prev,
      custom_filters: prev.custom_filters.map(rule =>
        rule.id === ruleId ? { ...rule, ...updates } : rule
      ),
    }));
  }, []);
  
  const removeFilterRule = useCallback((ruleId: string) => {
    setCampaign(prev => ({
      ...prev,
      custom_filters: prev.custom_filters.filter(rule => rule.id !== ruleId),
    }));
  }, []);
  
  // Load audience count
  useEffect(() => {
    async function loadAudienceCount() {
      setLoadingAudience(true);
      try {
        const filter = computeAudienceFilter();
        const result = await pb.collection('orders').getList(1, 1, {
          filter: filter + ' && customer_phone != ""',
        });
        setAudienceCount(result.totalItems);
      } catch (error) {
        console.error('Failed to load audience count:', error);
        setAudienceCount(null);
      } finally {
        setLoadingAudience(false);
      }
    }
    loadAudienceCount();
  }, [computeAudienceFilter]);
  
  // Update campaign field
  const updateCampaign = useCallback((field: keyof Campaign, value: unknown) => {
    setCampaign(prev => ({ ...prev, [field]: value }));
  }, []);
  
  // Insert variable into template
  const insertVariable = useCallback((token: string) => {
    const insertion = `{{${token}}}`;
    updateCampaign('message_template', campaign.message_template + insertion);
  }, [campaign.message_template, updateCampaign]);
  
  // Select template
  const selectTemplate = useCallback((templateId: string) => {
    const template = campaignTemplates.find(t => t.id === templateId);
    if (template) {
      updateCampaign('message_template', template.text);
    }
  }, [updateCampaign]);
  
  // Substitute variables in message
  const substituteVariables = useCallback((
    template: string,
    order: OrderRecord,
    campaignName: string
  ) => {
    return template
      .replace(/{{order\.customer_name}}/g, order.customer_name || 'Customer')
      .replace(/{{order\.customer_phone}}/g, order.customer_phone || '')
      .replace(/{{order\.id}}/g, order.id || '')
      .replace(/{{order\.total}}/g, String(order.total || order.totalAmount || 0))
      .replace(/{{order\.created}}/g, order.created ? new Date(order.created).toLocaleDateString('en-IN') : '')
      .replace(/{{campaign\.name}}/g, campaignName || 'Campaign');
  }, []);
  
  // Preview message with sample data
  const previewMessage = useMemo(() => {
    const sampleOrder: OrderRecord = {
      id: 'ORD123456',
      customer_name: 'John Doe',
      customer_phone: '9876543210',
      customer_email: 'john@example.com',
      total: 2500,
      totalAmount: 2500,
      status: 'delivered',
      payment_status: 'paid',
      created: new Date().toISOString(),
    };
    return substituteVariables(campaign.message_template, sampleOrder, campaign.name || 'My Campaign');
  }, [campaign.message_template, campaign.name, substituteVariables]);
  
  // Send campaign
  const sendCampaign = useCallback(async () => {
    if (!campaign.plugin_key) {
      toast({ title: 'Error', description: 'Please select a WhatsApp connection', variant: 'destructive' });
      return;
    }
    
    setSending(true);
    setSendStatus('running');
    setSendProgress(0);
    setSendLogs([]);
    setStopRequested(false);
    
    try {
      // Get plugin config
      const pluginRecord = await pb.collection('plugins').getFirstListItem(`key="${campaign.plugin_key}"`);
      const pluginConfig = pluginRecord.config as Record<string, unknown>;
      
      if (!pluginConfig?.baseUrl || !pluginConfig?.tokenOrKey) {
        throw new Error('WhatsApp plugin not configured properly');
      }
      
      // Get audience
      const filter = computeAudienceFilter();
      const orders = await pb.collection('orders').getFullList({
        filter: filter + ' && customer_phone != ""',
        sort: '-created',
      }) as unknown as OrderRecord[];
      
      if (orders.length === 0) {
        toast({ title: 'No recipients', description: 'No orders match your audience filter', variant: 'destructive' });
        setSending(false);
        setSendStatus('idle');
        return;
      }
      
      const instanceId = (pluginConfig.defaultSender as string) || 'zenthra';
      const apiKey = pluginConfig.tokenOrKey as string;
      const baseUrl = (pluginConfig.baseUrl as string).replace(/\/$/, '');
      
      // Calculate delay between messages
      const delayMs = campaign.max_per_minute > 0 ? Math.ceil(60000 / campaign.max_per_minute) : 3000;
      
      // Send to each recipient
      for (let i = 0; i < orders.length; i++) {
        if (stopRequested) {
          setSendStatus('paused');
          break;
        }
        
        const order = orders[i];
        const phone = order.customer_phone.replace(/\D/g, '');
        const formattedPhone = phone.startsWith('91') ? phone : `91${phone}`;
        
        const message = substituteVariables(campaign.message_template, order, campaign.name);
        
        const sendLog: CampaignSend = {
          id: `${i}`,
          campaign: campaign.name,
          order: order.id,
          user: order.user || null,
          target_phone: formattedPhone,
          target_name: order.customer_name,
          status: 'queued',
          error: null,
          sent_at: null,
        };
        
        try {
          const url = `${baseUrl}/message/sendText/${instanceId}`;
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': apiKey,
            },
            body: JSON.stringify({
              number: formattedPhone,
              text: message,
              delay: 250,
              linkPreview: true,
            }),
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          sendLog.status = 'sent';
          sendLog.sent_at = new Date().toISOString();
        } catch (error) {
          sendLog.status = 'failed';
          sendLog.error = error instanceof Error ? error.message : 'Unknown error';
        }
        
        setSendLogs(prev => [...prev, sendLog]);
        setSendProgress(Math.round(((i + 1) / orders.length) * 100));
        
        // Throttle
        if (i < orders.length - 1 && !stopRequested) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
      
      if (!stopRequested) {
        setSendStatus('completed');
        toast({ title: '✅ Campaign Sent', description: `Sent to ${orders.length} recipients` });
      }
      
    } catch (error) {
      console.error('Campaign send error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send campaign',
        variant: 'destructive',
      });
      setSendStatus('idle');
    } finally {
      setSending(false);
    }
  }, [campaign, computeAudienceFilter, substituteVariables, stopRequested, toast]);
  
  // Stop sending
  const stopSending = useCallback(() => {
    setStopRequested(true);
  }, []);
  
  // Reset
  const resetCampaign = useCallback(() => {
    setSendStatus('idle');
    setSendProgress(0);
    setSendLogs([]);
    setStopRequested(false);
  }, []);
  
  // Validation
  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 1:
        return campaign.name.trim().length > 0 && campaign.plugin_key.length > 0;
      case 2:
        // For custom segment, require at least one filter rule with a value
        if (campaign.audience_preset === 'custom') {
          return campaign.custom_filters.length > 0 && 
                 campaign.custom_filters.every(rule => rule.value.trim().length > 0);
        }
        return true;
      case 3:
        return campaign.message_template.trim().length > 0;
      case 4:
        return scheduleMode === 'now' || (scheduledDate && scheduledTime);
      default:
        return true;
    }
  }, [currentStep, campaign, scheduleMode, scheduledDate, scheduledTime]);
  
  // Stats
  const sendStats = useMemo(() => {
    const sent = sendLogs.filter(l => l.status === 'sent').length;
    const failed = sendLogs.filter(l => l.status === 'failed').length;
    return { sent, failed, total: sendLogs.length };
  }, [sendLogs]);
  
  return (
    <AdminLayout>
      {/* Header */}
      <div className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-4">
          <div className="flex-1">
            <h1 className="text-xl font-semibold">Campaign Builder</h1>
            <p className="text-sm text-muted-foreground">Create and send WhatsApp marketing campaigns</p>
          </div>
        </div>
      </div>
      
      <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : isCompleted
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                  <span className="font-medium text-sm">{step.name}</span>
                </button>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-muted'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
        
        {/* Step Content */}
        <Card>
          <CardContent className="pt-6">
            {/* Step 1: Basics */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="name">Campaign Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Diwali Sale 2024"
                    value={campaign.name}
                    onChange={(e) => updateCampaign('name', e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                
                <div>
                  <Label>Channel</Label>
                  <div className="mt-1.5 flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                    <MessageSquare className="w-5 h-5 text-green-600" />
                    <span className="font-medium">WhatsApp</span>
                    <Badge variant="secondary" className="ml-auto">Only option for now</Badge>
                  </div>
                </div>
                
                <div>
                  <Label>WhatsApp Connection</Label>
                  {loadingPlugins ? (
                    <div className="mt-1.5 flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading connections...
                    </div>
                  ) : plugins.length === 0 ? (
                    <div className="mt-1.5 p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 text-sm">
                      No WhatsApp plugins configured. Go to Plugins Manager to set up Evolution API or WhatsApp API.
                    </div>
                  ) : (
                    <Select
                      value={campaign.plugin_key}
                      onValueChange={(value) => updateCampaign('plugin_key', value)}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select connection" />
                      </SelectTrigger>
                      <SelectContent>
                        {plugins.map((plugin) => (
                          <SelectItem key={plugin.key} value={plugin.key}>
                            {plugin.name || plugin.key}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            )}
            
            {/* Step 2: Audience */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <Label>Target Audience</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Select which customers should receive this campaign
                  </p>
                  
                  <div className="grid gap-3">
                    {audiencePresets.map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => updateCampaign('audience_preset', preset.value)}
                        className={`flex items-start gap-3 p-4 border rounded-lg text-left transition-colors ${
                          campaign.audience_preset === preset.value
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                          campaign.audience_preset === preset.value
                            ? 'border-primary bg-primary'
                            : 'border-muted-foreground'
                        }`}>
                          {campaign.audience_preset === preset.value && (
                            <Check className="w-3 h-3 text-primary-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{preset.label}</div>
                          <div className="text-sm text-muted-foreground">{preset.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                
                {campaign.audience_preset === 'custom' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Build Your Segment</Label>
                        <p className="text-sm text-muted-foreground">
                          Add conditions to filter orders
                        </p>
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <HelpCircle className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs">
                            <p className="text-sm">
                              Add filter rules to target specific customers. All conditions must match (AND logic).
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    
                    {/* Filter Rules */}
                    <div className="space-y-3">
                      {campaign.custom_filters.map((rule, index) => {
                        const fieldDef = filterFields.find(f => f.value === rule.field);
                        const operators = operatorsByType[fieldDef?.type || 'text'] || operatorsByType.text;
                        
                        return (
                          <div key={rule.id} className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
                            {index > 0 && (
                              <Badge variant="secondary" className="text-xs shrink-0">AND</Badge>
                            )}
                            
                            {/* Field Select */}
                            <Select
                              value={rule.field}
                              onValueChange={(value) => {
                                const newFieldDef = filterFields.find(f => f.value === value);
                                const newOperators = operatorsByType[newFieldDef?.type || 'text'];
                                updateFilterRule(rule.id, { 
                                  field: value, 
                                  operator: newOperators[0].value,
                                  value: '' 
                                });
                              }}
                            >
                              <SelectTrigger className="w-[160px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {filterFields.map((field) => (
                                  <SelectItem key={field.value} value={field.value}>
                                    {field.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            
                            {/* Operator Select */}
                            <Select
                              value={rule.operator}
                              onValueChange={(value) => updateFilterRule(rule.id, { operator: value })}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {operators.map((op) => (
                                  <SelectItem key={op.value} value={op.value}>
                                    {op.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            
                            {/* Value Input - varies by field type */}
                            {fieldDef?.type === 'select' && fieldDef.options ? (
                              <Select
                                value={rule.value}
                                onValueChange={(value) => updateFilterRule(rule.id, { value })}
                              >
                                <SelectTrigger className="flex-1">
                                  <SelectValue placeholder="Select value" />
                                </SelectTrigger>
                                <SelectContent>
                                  {fieldDef.options.map((opt) => (
                                    <SelectItem key={opt} value={opt}>
                                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : fieldDef?.type === 'number' ? (
                              <Input
                                type="number"
                                placeholder="Enter amount"
                                value={rule.value}
                                onChange={(e) => updateFilterRule(rule.id, { value: e.target.value })}
                                className="flex-1"
                              />
                            ) : fieldDef?.type === 'date' ? (
                              <Input
                                type="date"
                                value={rule.value}
                                onChange={(e) => updateFilterRule(rule.id, { value: e.target.value })}
                                className="flex-1"
                              />
                            ) : (
                              <Input
                                type="text"
                                placeholder="Enter value"
                                value={rule.value}
                                onChange={(e) => updateFilterRule(rule.id, { value: e.target.value })}
                                className="flex-1"
                              />
                            )}
                            
                            {/* Remove Button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                              onClick={() => removeFilterRule(rule.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        );
                      })}
                      
                      {/* Add Rule Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addFilterRule}
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Condition
                      </Button>
                    </div>
                    
                    {/* Generated Filter Preview */}
                    {campaign.custom_filters.length > 0 && (
                      <div className="p-3 border rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground">Generated Filter</span>
                        </div>
                        <code className="text-xs text-muted-foreground break-all">
                          {buildFilterFromRules(campaign.custom_filters)}
                        </code>
                      </div>
                    )}
                    
                    {/* Empty State */}
                    {campaign.custom_filters.length === 0 && (
                      <div className="text-center py-6 border rounded-lg border-dashed">
                        <Users className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No conditions added yet.<br />
                          Click "Add Condition" to start building your segment.
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm">
                    Estimated recipients:{' '}
                    {loadingAudience ? (
                      <Loader2 className="w-4 h-4 animate-spin inline" />
                    ) : audienceCount !== null ? (
                      <strong>{audienceCount.toLocaleString()}</strong>
                    ) : (
                      <span className="text-muted-foreground">Unknown</span>
                    )}
                  </span>
                </div>
              </div>
            )}
            
            {/* Step 3: Message */}
            {currentStep === 3 && (
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Left: Editor */}
                <div className="space-y-4">
                  <div>
                    <Label>Quick Templates</Label>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {campaignTemplates.map((template) => (
                        <Button
                          key={template.id}
                          variant="outline"
                          size="sm"
                          onClick={() => selectTemplate(template.id)}
                          className="text-xs"
                        >
                          {template.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="message">Message Template</Label>
                    <Textarea
                      id="message"
                      value={campaign.message_template}
                      onChange={(e) => updateCampaign('message_template', e.target.value)}
                      className="mt-1.5 min-h-[200px] font-mono text-sm"
                      placeholder="Type your message here..."
                    />
                  </div>
                  
                  <div>
                    <Label>Insert Variables</Label>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {variableTokens.map((v) => {
                        const Icon = v.icon;
                        return (
                          <Button
                            key={v.token}
                            variant="secondary"
                            size="sm"
                            onClick={() => insertVariable(v.token)}
                            className="text-xs"
                          >
                            <Icon className="w-3 h-3 mr-1" />
                            {v.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                
                {/* Right: Preview */}
                <div>
                  <Label>Preview</Label>
                  <div className="mt-1.5 p-4 border rounded-lg bg-[#0b141a] min-h-[300px]">
                    <div className="max-w-[280px] ml-auto">
                      <div className="bg-[#005c4b] text-white p-3 rounded-lg rounded-tr-none text-sm whitespace-pre-wrap">
                        {previewMessage}
                      </div>
                      <div className="text-[10px] text-gray-400 text-right mt-1">
                        {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Step 4: Schedule */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <Label>When to send</Label>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <button
                      onClick={() => setScheduleMode('now')}
                      className={`flex items-center gap-3 p-4 border rounded-lg text-left transition-colors ${
                        scheduleMode === 'now'
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <Zap className="w-5 h-5 text-yellow-500" />
                      <div>
                        <div className="font-medium">Send Now</div>
                        <div className="text-sm text-muted-foreground">Start sending immediately</div>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => setScheduleMode('later')}
                      className={`flex items-center gap-3 p-4 border rounded-lg text-left transition-colors ${
                        scheduleMode === 'later'
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <Calendar className="w-5 h-5 text-blue-500" />
                      <div>
                        <div className="font-medium">Schedule for Later</div>
                        <div className="text-sm text-muted-foreground">Pick a date and time</div>
                      </div>
                    </button>
                  </div>
                </div>
                
                {scheduleMode === 'later' && (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="mt-1.5"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div>
                      <Label htmlFor="time">Time</Label>
                      <Input
                        id="time"
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                )}
                
                <div>
                  <Label htmlFor="throttle">Sending Speed</Label>
                  <div className="mt-1.5 flex items-center gap-3">
                    <Input
                      id="throttle"
                      type="number"
                      min={1}
                      max={60}
                      value={campaign.max_per_minute}
                      onChange={(e) => updateCampaign('max_per_minute', Number(e.target.value) || 20)}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">messages per minute</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Lower values help avoid rate limits. Recommended: 20-30/min
                  </p>
                </div>
                
                {/* Summary */}
                <Card className="bg-muted/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Campaign Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="font-medium">{campaign.name || '(not set)'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Channel:</span>
                      <span className="font-medium">WhatsApp</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Audience:</span>
                      <span className="font-medium">
                        {audiencePresets.find(p => p.value === campaign.audience_preset)?.label}
                        {audienceCount !== null && ` (${audienceCount})`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Send:</span>
                      <span className="font-medium">
                        {scheduleMode === 'now' ? 'Immediately' : `${scheduledDate} at ${scheduledTime}`}
                      </span>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Send Progress */}
                {sendStatus !== 'idle' && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        {sendStatus === 'running' && <Loader2 className="w-4 h-4 animate-spin" />}
                        {sendStatus === 'completed' && <Check className="w-4 h-4 text-green-500" />}
                        {sendStatus === 'paused' && <Pause className="w-4 h-4 text-yellow-500" />}
                        Sending Progress
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Progress value={sendProgress} className="h-2" />
                      <div className="flex justify-between text-sm">
                        <span>{sendProgress}% complete</span>
                        <span>
                          <span className="text-green-600">{sendStats.sent} sent</span>
                          {sendStats.failed > 0 && (
                            <span className="text-red-600 ml-2">{sendStats.failed} failed</span>
                          )}
                        </span>
                      </div>
                      
                      {/* Recent logs */}
                      <div className="max-h-[200px] overflow-auto border rounded-lg">
                        <table className="w-full text-xs">
                          <thead className="bg-muted sticky top-0">
                            <tr>
                              <th className="text-left p-2">Phone</th>
                              <th className="text-left p-2">Name</th>
                              <th className="text-left p-2">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sendLogs.slice(-20).reverse().map((log) => (
                              <tr key={log.id} className="border-t">
                                <td className="p-2 font-mono">{log.target_phone}</td>
                                <td className="p-2">{log.target_name}</td>
                                <td className="p-2">
                                  <Badge variant={log.status === 'sent' ? 'default' : 'destructive'} className="text-xs">
                                    {log.status}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(prev => prev - 1)}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div className="flex gap-2">
            {currentStep < 4 ? (
              <Button
                onClick={() => setCurrentStep(prev => prev + 1)}
                disabled={!canProceed}
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : sendStatus === 'idle' ? (
              <Button
                onClick={sendCampaign}
                disabled={!canProceed || sending}
                className="bg-green-600 hover:bg-green-700"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                {scheduleMode === 'now' ? 'Send Now' : 'Schedule Campaign'}
              </Button>
            ) : sendStatus === 'running' ? (
              <Button variant="destructive" onClick={stopSending}>
                <Pause className="w-4 h-4 mr-2" />
                Stop
              </Button>
            ) : (
              <Button variant="outline" onClick={resetCampaign}>
                <RotateCcw className="w-4 h-4 mr-2" />
                New Campaign
              </Button>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
