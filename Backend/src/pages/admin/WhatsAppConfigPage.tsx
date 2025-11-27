import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { pb } from '@/lib/pocketbase';
import {
  MessageCircle,
  RefreshCw,
  Save,
  CheckCircle,
  XCircle,
  Loader2,
  QrCode,
  Smartphone,
  Send,
  Image as ImageIcon,
  Edit,
  Plus,
  Trash2,
  Copy,
  Eye,
  Settings,
  Zap,
  Video,
  FileText,
  Upload,
  X,
  Check,
  Info,
  Activity,
  Clock,
  Mail,
  AlertCircle,
} from 'lucide-react';
import { getContentItems, uploadImage, uploadVideo, getContentImageUrl, getContentVideoUrl, type ContentItem } from '@/lib/content-service';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { useWhatsAppTemplates, Template } from '@/hooks/useWhatsAppTemplates';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Evolution API config interface
interface EvolutionConfig {
  baseUrl: string;
  apiKey: string;
  instanceName: string;
}

// Connection state interface
interface ConnectionState {
  state: 'open' | 'close' | 'connecting' | 'unknown';
  statusReason?: number;
}

// Order event types for templates
const ORDER_EVENTS = [
  { value: 'ORDER_CONFIRMATION', label: 'Order Confirmation', description: 'When order is placed' },
  { value: 'PAYMENT_SUCCESS', label: 'Payment Success', description: 'When payment is received' },
  { value: 'PAYMENT_FAILED', label: 'Payment Failed', description: 'When payment fails' },
  { value: 'ORDER_SHIPPED', label: 'Order Shipped', description: 'When order is shipped' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', description: 'When order is out for delivery' },
  { value: 'ORDER_DELIVERED', label: 'Order Delivered', description: 'When order is delivered' },
  { value: 'ORDER_CANCELLED', label: 'Order Cancelled', description: 'When order is cancelled' },
  { value: 'REFUND_CONFIRMATION', label: 'Refund Processed', description: 'When refund is processed' },
  { value: 'ABANDONED_CART', label: 'Abandoned Cart', description: 'Cart reminder message' },
  { value: 'REORDER_REMINDER', label: 'Reorder Reminder', description: 'Reminder to reorder' },
];

// Template variables available
const TEMPLATE_VARIABLES = [
  { key: '{{customerName}}', description: 'Customer name' },
  { key: '{{customerPhone}}', description: 'Customer phone number' },
  { key: '{{orderId}}', description: 'Order ID' },
  { key: '{{amount}}', description: 'Order amount' },
  { key: '{{firstProductName}}', description: 'First product name in the order' },
  { key: '{{productList}}', description: 'Comma separated list of product names' },
  { key: '{{itemsCount}}', description: 'Number of items in the order' },
  { key: '{{firstProductImageUrl}}', description: 'URL of the first product image in the order' },
  { key: '{{shippingAddress}}', description: 'Full shipping address' },
  { key: '{{trackingLink}}', description: 'Tracking URL' },
  { key: '{{carrier}}', description: 'Shipping carrier' },
  { key: '{{estimatedDelivery}}', description: 'Estimated delivery date' },
  { key: '{{feedbackLink}}', description: 'Feedback/Review link' },
  { key: '{{retryUrl}}', description: 'Payment retry URL' },
  { key: '{{refundAmount}}', description: 'Refund amount' },
  { key: '{{cartUrl}}', description: 'Cart URL' },
  { key: '{{storeName}}', description: 'Store name' },
];

const TEMPLATE_VARIABLE_GROUPS = [
  {
    label: 'Customer',
    keys: ['{{customerName}}', '{{customerPhone}}'],
  },
  {
    label: 'Order & Products',
    keys: ['{{orderId}}', '{{amount}}', '{{firstProductName}}', '{{productList}}', '{{itemsCount}}', '{{firstProductImageUrl}}'],
  },
  {
    label: 'Shipping & Links',
    keys: ['{{shippingAddress}}', '{{trackingLink}}', '{{carrier}}', '{{estimatedDelivery}}', '{{feedbackLink}}', '{{retryUrl}}', '{{refundAmount}}', '{{cartUrl}}', '{{storeName}}'],
  },
].map(group => ({
  label: group.label,
  items: group.keys
    .map(key => TEMPLATE_VARIABLES.find(v => v.key === key))
    .filter((v): v is { key: string; description: string } => Boolean(v)),
}));

export default function WhatsAppConfigPage() {
  const { toast } = useToast();
  const { templates, isLoading: templatesLoading, refreshTemplates, updateTemplate, createTemplate, deleteTemplate } = useWhatsAppTemplates();
  
  // Evolution API config state
  const [config, setConfig] = useState<EvolutionConfig>({
    baseUrl: '',
    apiKey: '',
    instanceName: '',
  });
  const [saving, setSaving] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  
  // Connection state
  const [connectionState, setConnectionState] = useState<ConnectionState>({ state: 'unknown' });
  const [checkingConnection, setCheckingConnection] = useState(false);
  
  // QR code state
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrRetryCount, setQrRetryCount] = useState(0);
  const MAX_QR_RETRIES = 3;
  
  // Available instances
  interface EvolutionInstance {
    id: string;
    name: string;
    connectionStatus: string;
    ownerJid?: string;
    profileName?: string;
    profilePictureUrl?: string;
  }
  const [availableInstances, setAvailableInstances] = useState<EvolutionInstance[]>([]);
  const [loadingInstances, setLoadingInstances] = useState(false);
  
  // Template editing state
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [newTemplateForm, setNewTemplateForm] = useState({
    name: '',
    content: '',
    description: '',
    isActive: true,
    requiresAdditionalInfo: false,
    additionalInfoLabel: '',
    additionalInfoPlaceholder: '',
    messageType: 'text' as 'text' | 'image' | 'video' | 'document',
    mediaUrl: '',
    mediaCaption: '',
  });
  
  // Content picker state
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaFilter, setMediaFilter] = useState<'all' | 'images' | 'videos'>('all');
  
  // Test message state
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  
  // Activity state
  interface ActivityLog {
    id: string;
    order_id: string;
    recipient: string;
    template_name?: string;
    message_content: string;
    status: 'sent' | 'failed';
    error_message?: string;
    media_url?: string;
    created: string;
  }
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [activityFilter, setActivityFilter] = useState<'all' | 'sent' | 'failed'>('all');

  // Load Evolution API config from plugins
  const loadConfig = useCallback(async () => {
    try {
      setLoadingConfig(true);
      const plugins = await pb.collection('plugins').getFullList();
      const evolutionPlugin = plugins.find(p => p.key === 'evolution_api');
      
      if (evolutionPlugin?.config) {
        const parsed = typeof evolutionPlugin.config === 'string' 
          ? JSON.parse(evolutionPlugin.config) 
          : evolutionPlugin.config;
        
        setConfig({
          baseUrl: parsed.baseUrl || '',
          apiKey: parsed.tokenOrKey || '',
          instanceName: parsed.defaultSender || '',
        });
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  // Save Evolution API config
  const saveConfig = async () => {
    try {
      setSaving(true);
      
      const plugins = await pb.collection('plugins').getFullList();
      const evolutionPlugin = plugins.find(p => p.key === 'evolution_api');
      
      const configData = {
        baseUrl: config.baseUrl,
        tokenOrKey: config.apiKey,
        defaultSender: config.instanceName,
        authType: 'header',
        authHeader: 'apikey',
      };
      
      if (evolutionPlugin) {
        await pb.collection('plugins').update(evolutionPlugin.id, {
          config: JSON.stringify(configData),
          enabled: true,
        });
      } else {
        await pb.collection('plugins').create({
          key: 'evolution_api',
          enabled: true,
          config: JSON.stringify(configData),
        });
      }
      
      toast({ title: 'Success', description: 'Configuration saved successfully' });
    } catch (error) {
      console.error('Failed to save config:', error);
      toast({ title: 'Error', description: 'Failed to save configuration', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Fetch available instances from Evolution API
  const fetchInstances = async () => {
    if (!config.baseUrl || !config.apiKey) {
      return;
    }
    
    try {
      setLoadingInstances(true);
      
      // Try different endpoints for fetching instances
      const endpoints = [
        '/instance/fetchInstances',
        '/instance/list',
        '/instances',
      ];
      
      for (const endpoint of endpoints) {
        try {
          const url = `${config.baseUrl.replace(/\/$/, '')}${endpoint}`;
          console.log('Trying to fetch instances from:', url);
          
          const response = await fetch(url, {
            headers: {
              'apikey': config.apiKey,
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('Instances response:', data);
            
            // Handle different response formats
            let instances: EvolutionInstance[] = [];
            
            if (Array.isArray(data)) {
              instances = data.map((inst: any) => ({
                id: inst.id || inst.instanceId || inst.instance?.instanceId,
                name: inst.name || inst.instanceName || inst.instance?.instanceName,
                connectionStatus: inst.connectionStatus || inst.status || inst.instance?.status || 'unknown',
                ownerJid: inst.ownerJid || inst.owner,
                profileName: inst.profileName,
                profilePictureUrl: inst.profilePictureUrl,
              }));
            } else if (data.instances) {
              instances = data.instances.map((inst: any) => ({
                id: inst.id || inst.instanceId,
                name: inst.name || inst.instanceName,
                connectionStatus: inst.connectionStatus || inst.status || 'unknown',
              }));
            }
            
            if (instances.length > 0) {
              setAvailableInstances(instances);
              console.log('Found instances:', instances);
              return;
            }
          }
        } catch (e) {
          console.log(`Endpoint ${endpoint} failed:`, e);
        }
      }
    } catch (error) {
      console.error('Failed to fetch instances:', error);
    } finally {
      setLoadingInstances(false);
    }
  };

  // Check connection state
  const checkConnection = async () => {
    if (!config.baseUrl || !config.instanceName || !config.apiKey) {
      toast({ title: 'Error', description: 'Please configure API settings first', variant: 'destructive' });
      return;
    }
    
    try {
      setCheckingConnection(true);
      const url = `${config.baseUrl.replace(/\/$/, '')}/instance/connectionState/${config.instanceName}`;
      
      const response = await fetch(url, {
        headers: {
          'apikey': config.apiKey,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to check connection');
      }
      
      const data = await response.json();
      console.log('Connection state response:', data);
      
      const state = data.instance?.state || data.state || 'unknown';
      setConnectionState({
        state: state,
        statusReason: data.instance?.statusReason,
      });
      
      // Don't auto-fetch QR - let user click manually to avoid loops
    } catch (error) {
      console.error('Failed to check connection:', error);
      setConnectionState({ state: 'unknown' });
      toast({ title: 'Error', description: 'Failed to check connection status', variant: 'destructive' });
    } finally {
      setCheckingConnection(false);
    }
  };

  // Fetch QR code with retry logic
  const fetchQrCode = async (isRetry = false) => {
    if (!config.baseUrl || !config.instanceName || !config.apiKey) {
      setQrError('Please configure API settings first');
      return;
    }
    
    // Check retry limit
    if (isRetry && qrRetryCount >= MAX_QR_RETRIES) {
      setQrError(`Max retries (${MAX_QR_RETRIES}) reached. Please check your configuration and try again.`);
      return;
    }
    
    try {
      setLoadingQr(true);
      setQrError(null);
      if (!isRetry) {
        setQrCode(null);
        setPairingCode(null);
        setQrRetryCount(0);
      } else {
        setQrRetryCount(prev => prev + 1);
      }
      
      // Use the correct endpoint: /instance/connect/{instance}
      const url = `${config.baseUrl.replace(/\/$/, '')}/instance/connect/${config.instanceName}`;
      console.log('Fetching QR code from:', url);
      console.log('Retry count:', isRetry ? qrRetryCount + 1 : 0);
      
      const response = await fetch(url, {
        headers: {
          'apikey': config.apiKey,
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('QR fetch error:', errorText);
        throw new Error(`Failed to fetch QR code: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Full QR response:', JSON.stringify(data, null, 2));
      
      // Evolution API returns:
      // - code: raw QR code data string (for generating QR image)
      // - pairingCode: 8-digit manual pairing code
      // - count: number of attempts
      // - base64: base64 encoded QR image (in some versions)
      
      let qrFound = false;
      
      // Check for base64 image first (some API versions)
      if (data.base64) {
        const base64Img = data.base64.startsWith('data:') ? data.base64 : `data:image/png;base64,${data.base64}`;
        setQrCode(base64Img);
        qrFound = true;
      } else if (data.qrcode?.base64) {
        const base64 = data.qrcode.base64;
        setQrCode(base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`);
        qrFound = true;
      } else if (data.qrcode) {
        // Some versions return qrcode as string directly
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data.qrcode)}`;
        setQrCode(qrApiUrl);
        qrFound = true;
      } else if (data.code && typeof data.code === 'string' && data.code.length > 10) {
        // Evolution API v2 returns raw QR data in 'code' field
        // Use a QR code API service to generate the image
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data.code)}`;
        setQrCode(qrApiUrl);
        qrFound = true;
      }
      
      // Set pairing code if available (8-digit code for manual entry)
      if (data.pairingCode) {
        setPairingCode(data.pairingCode);
      }
      
      // If no QR data at all, check various scenarios
      if (!qrFound) {
        console.log('No QR code found in response. Count:', data.count);
        
        // If count is returned but no code, instance might need reconnection
        if (data.count !== undefined) {
          // Check if instance is already connected
          const connResponse = await fetch(
            `${config.baseUrl.replace(/\/$/, '')}/instance/connectionState/${config.instanceName}`,
            { headers: { 'apikey': config.apiKey } }
          );
          
          if (connResponse.ok) {
            const connData = await connResponse.json();
            console.log('Connection state:', connData);
            
            if (connData.instance?.state === 'open' || connData.state === 'open') {
              setQrError('Instance is already connected! No QR code needed.');
              setConnectionState({ state: 'open' });
              return;
            }
          }
          
          // If we only got count, show helpful error
          setQrError(`QR code not available. Count: ${data.count}. The instance may need to be restarted or is already paired.`);
        } else {
          setQrError('No QR code returned. Check your instance configuration.');
        }
      }
    } catch (error) {
      console.error('Failed to fetch QR code:', error);
      setQrError('Failed to fetch QR code. Check your API configuration.');
    } finally {
      setLoadingQr(false);
    }
  };

  // Send test message
  const sendTestMessage = async () => {
    if (!testPhone || !testMessage) {
      toast({ title: 'Error', description: 'Please enter phone number and message', variant: 'destructive' });
      return;
    }
    
    try {
      setSendingTest(true);
      
      const url = `${config.baseUrl.replace(/\/$/, '')}/message/sendText/${config.instanceName}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.apiKey,
        },
        body: JSON.stringify({
          number: testPhone.replace(/\D/g, ''),
          text: testMessage,
          options: {
            delay: 1200,
            presence: 'composing',
          },
        }),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to send message');
      }
      
      toast({ title: 'Success', description: 'Test message sent successfully' });
    } catch (error) {
      console.error('Failed to send test message:', error);
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive' 
      });
    } finally {
      setSendingTest(false);
    }
  };

  // Template handlers
  const handleSaveTemplate = async () => {
    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, newTemplateForm);
        toast({ title: 'Success', description: 'Template updated successfully' });
      } else {
        await createTemplate(newTemplateForm as any);
        toast({ title: 'Success', description: 'Template created successfully' });
      }
      setTemplateDialogOpen(false);
      setEditingTemplate(null);
      resetTemplateForm();
    } catch (error) {
      console.error('Failed to save template:', error);
      toast({ title: 'Error', description: 'Failed to save template', variant: 'destructive' });
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      await deleteTemplate(id);
      toast({ title: 'Success', description: 'Template deleted successfully' });
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast({ title: 'Error', description: 'Failed to delete template', variant: 'destructive' });
    }
  };

  const openEditDialog = (template: Template) => {
    setEditingTemplate(template);
    setNewTemplateForm({
      name: template.name,
      content: template.content,
      description: template.description || '',
      isActive: template.isActive,
      requiresAdditionalInfo: template.requiresAdditionalInfo,
      additionalInfoLabel: template.additionalInfoLabel || '',
      additionalInfoPlaceholder: template.additionalInfoPlaceholder || '',
      messageType: (template as any).messageType || 'text',
      mediaUrl: (template as any).mediaUrl || '',
      mediaCaption: (template as any).mediaCaption || '',
    });
    setTemplateDialogOpen(true);
  };

  const resetTemplateForm = () => {
    setNewTemplateForm({
      name: '',
      content: '',
      description: '',
      isActive: true,
      requiresAdditionalInfo: false,
      additionalInfoLabel: '',
      additionalInfoPlaceholder: '',
      messageType: 'text',
      mediaUrl: '',
      mediaCaption: '',
    });
  };
  
  // Load content items for media picker
  const loadContentItems = async () => {
    try {
      setLoadingContent(true);
      const items = await getContentItems();
      setContentItems(items);
    } catch (error) {
      console.error('Failed to load content:', error);
    } finally {
      setLoadingContent(false);
    }
  };
  
  // Handle media upload
  const handleMediaUpload = async (file: File, type: 'image' | 'video') => {
    try {
      setUploadingMedia(true);
      const uploaded = type === 'image' ? await uploadImage(file) : await uploadVideo(file);
      if (uploaded) {
        await loadContentItems();
        const url = type === 'image' ? getContentImageUrl(uploaded) : getContentVideoUrl(uploaded);
        setNewTemplateForm(prev => ({ ...prev, mediaUrl: url }));
        toast({ title: 'Success', description: `${type === 'image' ? 'Image' : 'Video'} uploaded successfully` });
      }
    } catch (error) {
      console.error('Failed to upload:', error);
      toast({ title: 'Error', description: 'Failed to upload media', variant: 'destructive' });
    } finally {
      setUploadingMedia(false);
    }
  };
  
  // Select media from content picker
  const selectMedia = (item: ContentItem, type: 'image' | 'video') => {
    const url = type === 'image' ? getContentImageUrl(item) : getContentVideoUrl(item);
    setNewTemplateForm(prev => ({ ...prev, mediaUrl: url }));
    setMediaPickerOpen(false);
    toast({ title: 'Selected', description: 'Media selected successfully' });
  };
  
  // Filter content items
  const filteredContentItems = contentItems.filter(item => {
    if (mediaFilter === 'images') return item.Images;
    if (mediaFilter === 'videos') return item.Videos;
    return item.Images || item.Videos;
  });

  const insertVariable = (variable: string) => {
    setNewTemplateForm(prev => ({
      ...prev,
      content: prev.content + variable,
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: 'Variable copied to clipboard' });
  };
  
  // Load activity logs
  const loadActivities = async () => {
    setLoadingActivities(true);
    try {
      const records = await pb.collection('whatsapp_activity').getList(1, 50, {
        sort: '-created',
      });
      setActivities(records.items as unknown as typeof activities);
    } catch (error) {
      console.log('Activity log not available:', error);
      setActivities([]);
    } finally {
      setLoadingActivities(false);
    }
  };
  
  // Filter activities
  const filteredActivities = activities.filter(a => {
    if (activityFilter === 'all') return true;
    return a.status === activityFilter;
  });

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Auto-check connection when config is loaded
  useEffect(() => {
    if (config.baseUrl && config.instanceName && config.apiKey && !loadingConfig) {
      checkConnection();
    }
  }, [config.baseUrl, config.instanceName, config.apiKey, loadingConfig]);

  const getConnectionBadge = () => {
    switch (connectionState.state) {
      case 'open':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Connected</Badge>;
      case 'close':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Disconnected</Badge>;
      case 'connecting':
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Connecting</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageCircle className="h-6 w-6" />
              WhatsApp Configuration
            </h1>
            <p className="text-muted-foreground">
              Configure Evolution API and manage message templates
            </p>
          </div>
          {getConnectionBadge()}
        </div>

        <Tabs defaultValue="connection" className="space-y-4">
          <TabsList>
            <TabsTrigger value="connection" className="gap-2">
              <QrCode className="h-4 w-4" />
              Connection
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <Edit className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="test" className="gap-2">
              <Send className="h-4 w-4" />
              Test
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2" onClick={loadActivities}>
              <Activity className="h-4 w-4" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Connection Tab */}
          <TabsContent value="connection" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* QR Code Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    WhatsApp Connection
                  </CardTitle>
                  <CardDescription>
                    Scan the QR code with WhatsApp to connect your instance
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <span>Status:</span>
                    {getConnectionBadge()}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={checkConnection}
                      disabled={checkingConnection}
                    >
                      <RefreshCw className={`h-4 w-4 mr-1 ${checkingConnection ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                  
                  {connectionState.state === 'open' ? (
                    <div className="flex flex-col items-center justify-center p-8 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                      <p className="text-lg font-medium text-green-700 dark:text-green-400">
                        WhatsApp is connected!
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your instance is ready to send messages
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      {loadingQr ? (
                        <div className="flex flex-col items-center justify-center p-8">
                          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
                          <p>Loading QR code...</p>
                        </div>
                      ) : qrCode ? (
                        <div className="flex flex-col items-center">
                          <div className="p-4 bg-white rounded-xl shadow-lg">
                            <img
                              src={qrCode}
                              alt="WhatsApp QR Code"
                              className="w-64 h-64"
                              onError={(e) => {
                                console.error('QR image failed to load');
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                          
                          {/* Pairing Code - alternative to QR */}
                          {pairingCode && (
                            <div className="mt-4 p-4 bg-muted rounded-lg text-center">
                              <p className="text-sm text-muted-foreground mb-2">Or enter this code manually:</p>
                              <div className="text-2xl font-mono font-bold tracking-widest bg-background px-4 py-2 rounded border">
                                {pairingCode}
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">
                                WhatsApp → Linked Devices → Link with phone number
                              </p>
                            </div>
                          )}
                          
                          <p className="text-sm text-muted-foreground mt-4">
                            Open WhatsApp → Settings → Linked Devices → Link a Device
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchQrCode(true)}
                            className="mt-2"
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Refresh QR Code
                          </Button>
                          {qrRetryCount > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Attempt {qrRetryCount}/{MAX_QR_RETRIES}
                            </p>
                          )}
                        </div>
                      ) : qrError ? (
                        <div className="flex flex-col items-center justify-center p-8 text-center">
                          <XCircle className="h-12 w-12 text-destructive mb-4" />
                          <p className="text-destructive">{qrError}</p>
                          {qrRetryCount >= MAX_QR_RETRIES ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setQrRetryCount(0); fetchQrCode(false); }}
                              className="mt-4"
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Reset & Try Again
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => fetchQrCode(true)}
                              className="mt-4"
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Retry ({qrRetryCount}/{MAX_QR_RETRIES})
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-8">
                          <Smartphone className="h-12 w-12 text-muted-foreground mb-4" />
                          <p className="text-muted-foreground mb-4">Click to generate QR code</p>
                          <Button onClick={() => fetchQrCode(false)}>
                            <QrCode className="h-4 w-4 mr-2" />
                            Generate QR Code
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Info Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Quick Setup Guide
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">1</div>
                      <div>
                        <p className="font-medium">Configure API Settings</p>
                        <p className="text-sm text-muted-foreground">Enter your Evolution API URL and credentials in Settings tab</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">2</div>
                      <div>
                        <p className="font-medium">Scan QR Code</p>
                        <p className="text-sm text-muted-foreground">Open WhatsApp and scan the QR code to link your device</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">3</div>
                      <div>
                        <p className="font-medium">Customize Templates</p>
                        <p className="text-sm text-muted-foreground">Edit message templates for order events</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">4</div>
                      <div>
                        <p className="font-medium">Test & Go Live</p>
                        <p className="text-sm text-muted-foreground">Send a test message to verify everything works</p>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <p className="font-medium mb-2">Instance Details</p>
                    <div className="text-sm space-y-1">
                      <p><span className="text-muted-foreground">Instance:</span> {config.instanceName || 'Not configured'}</p>
                      <p><span className="text-muted-foreground">API URL:</span> {config.baseUrl || 'Not configured'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Message Templates</CardTitle>
                  <CardDescription>
                    Configure WhatsApp message templates for order events
                  </CardDescription>
                </div>
                <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { setEditingTemplate(null); resetTemplateForm(); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingTemplate ? 'Edit Template' : 'Create Template'}
                      </DialogTitle>
                      <DialogDescription>
                        Configure the message template for order notifications
                      </DialogDescription>
                    </DialogHeader>
                    
                    {/* Side-by-side layout: Form on left, Preview on right */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
                      {/* Left side: Form */}
                      <div className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="templateName">Template Name</Label>
                        <Select 
                          value={newTemplateForm.name} 
                          onValueChange={(v) => setNewTemplateForm(prev => ({ ...prev, name: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select event type" />
                          </SelectTrigger>
                          <SelectContent>
                            {ORDER_EVENTS.map(event => (
                              <SelectItem key={event.value} value={event.value}>
                                {event.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Input
                          id="description"
                          value={newTemplateForm.description}
                          onChange={(e) => setNewTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="When this template is used..."
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="content">Message Content</Label>
                        <Textarea
                          id="content"
                          value={newTemplateForm.content}
                          onChange={(e) => setNewTemplateForm(prev => ({ ...prev, content: e.target.value }))}
                          placeholder="Enter your message template..."
                          rows={6}
                        />
                        <p className="text-xs text-muted-foreground">
                          Use variables like {'{{customerName}}'} to personalize messages
                        </p>
                      </div>
                      
                      {/* Variable quick insert */}
                      <div className="grid gap-2">
                        <Label>Quick Insert Variables</Label>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                          {TEMPLATE_VARIABLE_GROUPS.map((group) => (
                            <Select
                              key={group.label}
                              onValueChange={(variableKey) => {
                                insertVariable(variableKey);
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder={group.label} />
                              </SelectTrigger>
                              <SelectContent>
                                {group.items.map((v) => (
                                  <SelectItem key={v.key} value={v.key}>
                                    {v.key}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ))}
                        </div>
                      </div>
                      
                      {/* Message Type Selector */}
                      <Separator />
                      <div className="grid gap-2">
                        <Label>Message Type</Label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { value: 'text', label: 'Text Only', icon: MessageCircle },
                            { value: 'image', label: 'Text + Image', icon: ImageIcon },
                            { value: 'video', label: 'Text + Video', icon: Video },
                            { value: 'document', label: 'Text + Document', icon: FileText },
                          ].map((type) => (
                            <Button
                              key={type.value}
                              type="button"
                              variant={newTemplateForm.messageType === type.value ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setNewTemplateForm(prev => ({ ...prev, messageType: type.value as any }))}
                              className="gap-2"
                            >
                              <type.icon className="h-4 w-4" />
                              {type.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Media Selection - Only show when type is not text */}
                      {newTemplateForm.messageType !== 'text' && (
                        <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">
                              {newTemplateForm.messageType === 'image' ? 'Image' : 
                               newTemplateForm.messageType === 'video' ? 'Video' : 'Document'} Attachment
                            </Label>
                            <Dialog open={mediaPickerOpen} onOpenChange={setMediaPickerOpen}>
                              <DialogTrigger asChild>
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    loadContentItems();
                                    setMediaFilter(newTemplateForm.messageType === 'video' ? 'videos' : 'images');
                                  }}
                                >
                                  <ImageIcon className="h-4 w-4 mr-2" />
                                  Browse Content
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl max-h-[80vh]">
                                <DialogHeader>
                                  <DialogTitle>Select Media from Content Library</DialogTitle>
                                  <DialogDescription>
                                    Choose an image or video from your content collection, or upload a new one
                                  </DialogDescription>
                                </DialogHeader>
                                
                                {/* Filter tabs */}
                                <div className="flex items-center gap-2 border-b pb-2">
                                  <Button
                                    variant={mediaFilter === 'all' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setMediaFilter('all')}
                                  >
                                    All
                                  </Button>
                                  <Button
                                    variant={mediaFilter === 'images' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setMediaFilter('images')}
                                  >
                                    <ImageIcon className="h-4 w-4 mr-1" />
                                    Images
                                  </Button>
                                  <Button
                                    variant={mediaFilter === 'videos' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setMediaFilter('videos')}
                                  >
                                    <Video className="h-4 w-4 mr-1" />
                                    Videos
                                  </Button>
                                  
                                  <div className="ml-auto flex gap-2">
                                    <label className="cursor-pointer">
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handleMediaUpload(file, 'image');
                                        }}
                                      />
                                      <Button type="button" variant="outline" size="sm" asChild>
                                        <span>
                                          <Upload className="h-4 w-4 mr-1" />
                                          Upload Image
                                        </span>
                                      </Button>
                                    </label>
                                    <label className="cursor-pointer">
                                      <input
                                        type="file"
                                        accept="video/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handleMediaUpload(file, 'video');
                                        }}
                                      />
                                      <Button type="button" variant="outline" size="sm" asChild>
                                        <span>
                                          <Upload className="h-4 w-4 mr-1" />
                                          Upload Video
                                        </span>
                                      </Button>
                                    </label>
                                  </div>
                                </div>
                                
                                {/* Content grid */}
                                <ScrollArea className="h-[400px]">
                                  {loadingContent || uploadingMedia ? (
                                    <div className="flex items-center justify-center py-12">
                                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                    </div>
                                  ) : filteredContentItems.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                      <ImageIcon className="h-12 w-12 mb-4" />
                                      <p>No content found</p>
                                      <p className="text-sm">Upload images or videos to get started</p>
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-3 md:grid-cols-4 gap-3 p-1">
                                      {filteredContentItems.map((item) => (
                                        <div key={item.id} className="relative group">
                                          {item.Images && (
                                            <button
                                              type="button"
                                              onClick={() => selectMedia(item, 'image')}
                                              className="w-full aspect-square rounded-lg overflow-hidden border hover:border-primary transition-colors"
                                            >
                                              <img
                                                src={getContentImageUrl(item)}
                                                alt=""
                                                className="w-full h-full object-cover"
                                              />
                                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Check className="h-6 w-6 text-white" />
                                              </div>
                                            </button>
                                          )}
                                          {item.Videos && !item.Images && (
                                            <button
                                              type="button"
                                              onClick={() => selectMedia(item, 'video')}
                                              className="w-full aspect-square rounded-lg overflow-hidden border hover:border-primary transition-colors bg-muted flex items-center justify-center"
                                            >
                                              <Video className="h-8 w-8 text-muted-foreground" />
                                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Check className="h-6 w-6 text-white" />
                                              </div>
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </ScrollArea>
                              </DialogContent>
                            </Dialog>
                          </div>
                          
                          {/* Media URL input with preview */}
                          <div className="grid gap-2">
                            <Label htmlFor="mediaUrl" className="text-xs text-muted-foreground">Media URL</Label>
                            <div className="flex gap-2">
                              <Input
                                id="mediaUrl"
                                value={newTemplateForm.mediaUrl}
                                onChange={(e) => setNewTemplateForm(prev => ({ ...prev, mediaUrl: e.target.value }))}
                                placeholder="Select from content, paste URL, or use a variable"
                                className="flex-1"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setNewTemplateForm(prev => ({ ...prev, mediaUrl: '{{firstProductImageUrl}}' }))}                                className="text-xs"
                              >
                                Use product image
                              </Button>
                              {newTemplateForm.mediaUrl && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setNewTemplateForm(prev => ({ ...prev, mediaUrl: '' }))}
                                  title="Clear media URL"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          {/* Preview */}
                          {newTemplateForm.mediaUrl && (
                            <div className="relative w-full max-w-[200px] rounded-lg overflow-hidden border">
                              {newTemplateForm.messageType === 'image' ? (
                                <img
                                  src={newTemplateForm.mediaUrl}
                                  alt="Preview"
                                  className="w-full h-auto"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23f0f0f0" width="100%" height="100%"/><text x="50%" y="50%" text-anchor="middle" fill="%23999">Error</text></svg>';
                                  }}
                                />
                              ) : newTemplateForm.messageType === 'video' ? (
                                <video
                                  src={newTemplateForm.mediaUrl}
                                  className="w-full h-auto"
                                  controls
                                />
                              ) : (
                                <div className="p-4 flex items-center gap-2 bg-muted">
                                  <FileText className="h-8 w-8" />
                                  <span className="text-sm truncate">Document</span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Caption for media */}
                          <div className="grid gap-2">
                            <Label htmlFor="mediaCaption" className="text-xs text-muted-foreground">
                              Caption (optional)
                            </Label>
                            <Input
                              id="mediaCaption"
                              value={newTemplateForm.mediaCaption}
                              onChange={(e) => setNewTemplateForm(prev => ({ ...prev, mediaCaption: e.target.value }))}
                              placeholder="Caption for the media..."
                            />
                          </div>
                          
                          {/* API Info */}
                          <div className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded text-xs text-blue-700 dark:text-blue-400">
                            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium">Evolution API Fields:</p>
                              <ul className="mt-1 space-y-0.5">
                                <li>• <code>number</code>: Recipient phone</li>
                                <li>• <code>mediaMessage.{newTemplateForm.messageType}.url</code>: Media URL</li>
                                <li>• <code>caption</code>: Optional text caption</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="isActive">Active</Label>
                        <Switch
                          id="isActive"
                          checked={newTemplateForm.isActive}
                          onCheckedChange={(v) => setNewTemplateForm(prev => ({ ...prev, isActive: v }))}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="requiresAdditionalInfo">Requires Additional Info</Label>
                        <Switch
                          id="requiresAdditionalInfo"
                          checked={newTemplateForm.requiresAdditionalInfo}
                          onCheckedChange={(v) => setNewTemplateForm(prev => ({ ...prev, requiresAdditionalInfo: v }))}
                        />
                      </div>
                      
                      {newTemplateForm.requiresAdditionalInfo && (
                        <>
                          <div className="grid gap-2">
                            <Label htmlFor="additionalInfoLabel">Additional Info Label</Label>
                            <Input
                              id="additionalInfoLabel"
                              value={newTemplateForm.additionalInfoLabel}
                              onChange={(e) => setNewTemplateForm(prev => ({ ...prev, additionalInfoLabel: e.target.value }))}
                              placeholder="e.g., Tracking Link"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="additionalInfoPlaceholder">Placeholder</Label>
                            <Input
                              id="additionalInfoPlaceholder"
                              value={newTemplateForm.additionalInfoPlaceholder}
                              onChange={(e) => setNewTemplateForm(prev => ({ ...prev, additionalInfoPlaceholder: e.target.value }))}
                              placeholder="e.g., https://tracking.com/..."
                            />
                          </div>
                        </>
                      )}
                      </div>
                      
                      {/* Right side: Live Preview */}
                      <div className="space-y-4 lg:sticky lg:top-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2">
                              <Eye className="h-4 w-4" />
                              Live Preview
                            </Label>
                            <Badge variant="secondary" className="text-xs">
                              Sample Data
                            </Badge>
                          </div>
                          
                          {/* WhatsApp phone mockup */}
                          <div className="p-4 rounded-2xl bg-[#0B141A] border border-[#2A3942]">
                            {/* Phone header */}
                            <div className="flex items-center gap-3 pb-3 border-b border-[#2A3942] mb-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold">
                                Z
                              </div>
                              <div>
                                <p className="text-white font-medium text-sm">Zenthra Shop</p>
                                <p className="text-[#8696A0] text-xs">online</p>
                              </div>
                            </div>
                            
                            {/* Message bubble */}
                            {newTemplateForm.content ? (
                              <div className="bg-[#005C4B] rounded-lg p-3 text-white text-sm whitespace-pre-wrap break-words max-w-[280px]">
                                {/* Media preview */}
                                {newTemplateForm.messageType !== 'text' && newTemplateForm.mediaUrl && (
                                  <div className="mb-2 rounded overflow-hidden -mx-1 -mt-1">
                                    {newTemplateForm.messageType === 'image' ? (
                                      <img 
                                        src={newTemplateForm.mediaUrl} 
                                        alt="Preview" 
                                        className="w-full h-32 object-cover"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                    ) : newTemplateForm.messageType === 'video' ? (
                                      <div className="w-full h-32 bg-black/30 flex items-center justify-center">
                                        <Video className="h-8 w-8 text-white/70" />
                                      </div>
                                    ) : (
                                      <div className="w-full h-16 bg-black/30 flex items-center gap-2 px-3">
                                        <FileText className="h-6 w-6 text-white/70" />
                                        <span className="text-white/70 text-xs">Document</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {/* Message with variables replaced */}
                                {newTemplateForm.content
                                  .replace(/\{\{customerName\}\}/g, 'John Doe')
                                  .replace(/\{\{customerPhone\}\}/g, '+91 98765 43210')
                                  .replace(/\{\{orderId\}\}/g, 'ORD12345')
                                  .replace(/\{\{amount\}\}/g, '₹1,299')
                                  .replace(/\{\{firstProductName\}\}/g, 'Viruthvi Gold Saree')
                                  .replace(/\{\{productList\}\}/g, 'Viruthvi Gold Saree, Ananya Silk Blouse')
                                  .replace(/\{\{itemsCount\}\}/g, '2')
                                  .replace(/\{\{shippingAddress\}\}/g, '12, MG Road, Chennai, TN 600001, India')
                                  .replace(/\{\{trackingLink\}\}/g, 'https://track.example.com/123')
                                  .replace(/\{\{carrier\}\}/g, 'BlueDart')
                                  .replace(/\{\{estimatedDelivery\}\}/g, '3-5 business days')
                                  .replace(/\{\{feedbackLink\}\}/g, 'https://example.com/feedback')
                                  .replace(/\{\{retryUrl\}\}/g, 'https://example.com/retry')
                                  .replace(/\{\{refundAmount\}\}/g, '₹500')
                                  .replace(/\{\{cartUrl\}\}/g, 'https://example.com/cart')
                                  .replace(/\{\{storeName\}\}/g, 'Zenthra Shop')
                                  .replace(/\{\{firstProductImageUrl\}\}/g, 'https://cdn.example.com/products/first.jpg')
                                }
                                {/* Timestamp */}
                                <div className="text-[10px] text-white/50 text-right mt-1 flex items-center justify-end gap-1">
                                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  <CheckCircle className="h-3 w-3" />
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-8 text-[#8696A0] text-sm">
                                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                Start typing to see preview
                              </div>
                            )}
                          </div>
                          
                          {/* Variable legend */}
                          <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/50 rounded-lg border">
                            <p className="font-medium flex items-center gap-1">
                              <Info className="h-3 w-3" />
                              Sample values:
                            </p>
                            <div className="grid grid-cols-1 gap-1 text-[11px]">
                              <span><code className="bg-muted px-1 rounded">customerName</code> → John Doe</span>
                              <span><code className="bg-muted px-1 rounded">orderId</code> → ORD12345</span>
                              <span><code className="bg-muted px-1 rounded">amount</code> → ₹1,299</span>
                              <span><code className="bg-muted px-1 rounded">carrier</code> → BlueDart</span>
                              <span><code className="bg-muted px-1 rounded">trackingLink</code> → https://track...</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveTemplate}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Template
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {templatesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No templates found</p>
                    <Button className="mt-4" onClick={() => setTemplateDialogOpen(true)}>
                      Create First Template
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templates.map((template) => {
                        const eventInfo = ORDER_EVENTS.find(e => e.value === template.name);
                        return (
                          <TableRow key={template.id}>
                            <TableCell className="font-medium">
                              {eventInfo?.label || template.name}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {template.description || eventInfo?.description || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={template.isActive ? 'default' : 'secondary'}>
                                {template.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditDialog(template)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteTemplate(template.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Test Tab */}
          <TabsContent value="test" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Send Test Message
                </CardTitle>
                <CardDescription>
                  Test your WhatsApp configuration by sending a message
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="testPhone">Phone Number</Label>
                  <Input
                    id="testPhone"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="919876543210 (with country code)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter phone number with country code, without + or spaces
                  </p>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="testMessage">Message</Label>
                  <Textarea
                    id="testMessage"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Hello! This is a test message."
                    rows={4}
                  />
                </div>
                
                <Button 
                  onClick={sendTestMessage} 
                  disabled={sendingTest || !testPhone || !testMessage}
                  className="w-full"
                >
                  {sendingTest ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Test Message
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Evolution API Settings
                </CardTitle>
                <CardDescription>
                  Configure your Evolution API connection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingConfig ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="baseUrl">API Base URL</Label>
                      <Input
                        id="baseUrl"
                        value={config.baseUrl}
                        onChange={(e) => setConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                        placeholder="https://api.evolution-api.com"
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="instanceName">Instance Name / ID</Label>
                      <div className="flex gap-2">
                        <Input
                          id="instanceName"
                          value={config.instanceName}
                          onChange={(e) => setConfig(prev => ({ ...prev, instanceName: e.target.value }))}
                          placeholder="my-instance or UUID"
                          className="flex-1"
                        />
                        <Button 
                          variant="outline" 
                          onClick={fetchInstances}
                          disabled={loadingInstances || !config.baseUrl || !config.apiKey}
                          title="Fetch available instances"
                        >
                          {loadingInstances ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Enter instance name or UUID. Click refresh to fetch available instances.
                      </p>
                      
                      {/* Available instances dropdown */}
                      {availableInstances.length > 0 && (
                        <div className="mt-2 p-3 bg-muted rounded-lg space-y-2">
                          <p className="text-xs font-medium">Available Instances:</p>
                          <div className="space-y-1">
                            {availableInstances.map((inst) => (
                              <div 
                                key={inst.id || inst.name}
                                className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-background transition-colors ${
                                  config.instanceName === inst.name || config.instanceName === inst.id 
                                    ? 'bg-primary/10 border border-primary' 
                                    : 'bg-background/50'
                                }`}
                                onClick={() => setConfig(prev => ({ ...prev, instanceName: inst.name || inst.id }))}
                              >
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${
                                    inst.connectionStatus === 'open' ? 'bg-green-500' : 
                                    inst.connectionStatus === 'close' ? 'bg-red-500' : 'bg-yellow-500'
                                  }`} />
                                  <div>
                                    <p className="text-sm font-medium">{inst.name}</p>
                                    {inst.id && inst.id !== inst.name && (
                                      <p className="text-xs text-muted-foreground font-mono">{inst.id}</p>
                                    )}
                                  </div>
                                </div>
                                <Badge variant={inst.connectionStatus === 'open' ? 'default' : 'secondary'} className="text-xs">
                                  {inst.connectionStatus}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="apiKey">API Key</Label>
                      <Input
                        id="apiKey"
                        type="password"
                        value={config.apiKey}
                        onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                        placeholder="Your API key"
                      />
                    </div>
                    
                    <Separator />
                    
                    <Button onClick={saveConfig} disabled={saving} className="w-full">
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Settings
                        </>
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Message Activity Log
                    </CardTitle>
                    <CardDescription>
                      View all WhatsApp message activities and their status
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={activityFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActivityFilter('all')}
                    >
                      All
                    </Button>
                    <Button
                      variant={activityFilter === 'sent' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActivityFilter('sent')}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Sent
                    </Button>
                    <Button
                      variant={activityFilter === 'failed' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActivityFilter('failed')}
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Failed
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadActivities}
                    >
                      <RefreshCw className={`h-3 w-3 ${loadingActivities ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingActivities ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredActivities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Activity className="h-12 w-12 mb-4 opacity-50" />
                    <p className="font-medium">No activities found</p>
                    <p className="text-sm">
                      {activities.length === 0 
                        ? 'Messages will appear here when sent via WhatsApp' 
                        : 'No activities match the current filter'}
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                      {filteredActivities.map((activity) => (
                        <div
                          key={activity.id}
                          className={`p-4 rounded-lg border ${
                            activity.status === 'sent' 
                              ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30' 
                              : 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {activity.status === 'sent' ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-red-600" />
                                )}
                                <span className="font-medium">
                                  {activity.template_name || 'Custom Message'}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {activity.recipient}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                {activity.message_content}
                              </p>
                              {activity.error_message && (
                                <p className="text-xs text-red-600 dark:text-red-400">
                                  Error: {activity.error_message}
                                </p>
                              )}
                              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(activity.created).toLocaleString()}
                                </span>
                                {activity.order_id && (
                                  <span>Order: {activity.order_id.slice(0, 8)}</span>
                                )}
                                {activity.media_url && (
                                  <span className="flex items-center gap-1">
                                    <ImageIcon className="h-3 w-3" />
                                    With Media
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
                
                {/* Integration hint */}
                <div className="mt-4 p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-start gap-2 text-sm">
                    <Info className="h-4 w-4 mt-0.5 text-blue-500" />
                    <div>
                      <p className="font-medium">Communication Integrations</p>
                      <p className="text-muted-foreground text-xs mt-1">
                        This activity log tracks WhatsApp messages. Email and other communication channels can be integrated here for unified tracking.
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs gap-1">
                          <MessageCircle className="h-3 w-3" />
                          WhatsApp Active
                        </Badge>
                        <Badge variant="outline" className="text-xs gap-1 opacity-50">
                          <Mail className="h-3 w-3" />
                          Email (Coming Soon)
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
