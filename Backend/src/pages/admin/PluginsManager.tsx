import { useEffect, useState, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { pb } from '@/lib/pocketbase';
import {
  Plug,
  MessageCircle,
  Video,
  BarChart,
  Code,
  Sparkles,
  Save,
  RefreshCw,
  Plus,
  Trash2,
  Search,
  X,
  Upload,
  Image as ImageIcon,
  Play,
  Check,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getContentItems, uploadVideo, getContentVideoUrl, type ContentItem, getContentImageUrl, uploadImage } from '@/lib/content-service';

type PluginKey =
  | 'whatsapp_floating'
  | 'video_floating'
  | 'popup_banner'
  | 'google_analytics'
  | 'google_tag_manager'
  | 'facebook_pixel'
  | 'microsoft_clarity'
  | 'custom_scripts'
  | 'whatsapp_api'
  | 'evolution_api'
  | 'gemini_ai';

interface Plugin {
  id: string;
  key: PluginKey;
  enabled: boolean;
  config: any;
  created: string;
  updated: string;
}

const PLUGIN_INFO = {
  whatsapp_floating: {
    name: 'WhatsApp Floating Button',
    description: 'Add a floating WhatsApp button for customer support',
    icon: MessageCircle,
    category: 'communication',
  },
  video_floating: {
    name: 'Floating Video Player',
    description: 'Display promotional videos that float on your site',
    icon: Video,
    category: 'marketing',
  },
  popup_banner: {
    name: 'Popup Banner',
    description: 'Show promotional popups to visitors',
    icon: Sparkles,
    category: 'marketing',
  },
  google_analytics: {
    name: 'Google Analytics',
    description: 'Track website traffic and user behavior',
    icon: BarChart,
    category: 'analytics',
  },
  google_tag_manager: {
    name: 'Google Tag Manager',
    description: 'Manage marketing and analytics tags',
    icon: Code,
    category: 'analytics',
  },
  facebook_pixel: {
    name: 'Facebook Pixel',
    description: 'Track conversions from Facebook ads',
    icon: BarChart,
    category: 'analytics',
  },
  microsoft_clarity: {
    name: 'Microsoft Clarity',
    description: 'Understand user behavior with heatmaps',
    icon: BarChart,
    category: 'analytics',
  },
  custom_scripts: {
    name: 'Custom Scripts',
    description: 'Add custom JavaScript to your site',
    icon: Code,
    category: 'advanced',
  },
  whatsapp_api: {
    name: 'WhatsApp API',
    description: 'Send WhatsApp messages via API',
    icon: MessageCircle,
    category: 'communication',
  },
  evolution_api: {
    name: 'Evolution API',
    description: 'Advanced WhatsApp integration',
    icon: MessageCircle,
    category: 'communication',
  },
  gemini_ai: {
    name: 'Gemini AI',
    description: 'AI-powered features with Google Gemini',
    icon: Sparkles,
    category: 'ai',
  },
};

export default function PluginsManager() {
  const { toast } = useToast();
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [config, setConfig] = useState<any>({});

  // Content Selection State
  const [videoPickerOpen, setVideoPickerOpen] = useState(false);
  const [videos, setVideos] = useState<ContentItem[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [images, setImages] = useState<ContentItem[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);

  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  
  // Selection Context
  const [selectedProductForVideo, setSelectedProductForVideo] = useState<{index: number, type: 'main' | 'path'} | null>(null);
  const [selectedVideoField, setSelectedVideoField] = useState<{type: 'main' | 'product' | 'path', index?: number} | null>(null);

  // Testing State
  const [testing, setTesting] = useState<{ type: 'whatsapp' | 'evolution' | null }>({ type: null });
  const [testTarget, setTestTarget] = useState('');

  const loadPlugins = async () => {
    try {
      setLoading(true);
      const records = await pb.collection('plugins').getFullList<Plugin>({
        sort: 'key',
      });
      setPlugins(records);
    } catch (error) {
      console.error('Failed to load plugins:', error);
      toast({
        title: 'Error',
        description: 'Failed to load plugins',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadVideos = async () => {
    try {
      setLoadingVideos(true);
      const items = await getContentItems();
      const onlyVideos = items.filter((it) => Boolean(it.Videos));
      setVideos(onlyVideos);
    } finally {
      setLoadingVideos(false);
    }
  };

  const handleUploadVideo = async (file: File) => {
    const created = await uploadVideo(file);
    if (created) {
      await loadVideos();
      const url = getContentVideoUrl(created);
      
      if (selectedVideoField?.type === 'main') {
        updateConfig('videoUrl', url);
      } else if (selectedVideoField?.type === 'product' && selectedVideoField.index !== undefined) {
        const updated = [...(config.productVideos || [])];
        updated[selectedVideoField.index] = { ...updated[selectedVideoField.index], videoUrl: url };
        updateConfig('productVideos', updated);
      } else if (selectedVideoField?.type === 'path' && selectedVideoField.index !== undefined) {
        const updated = [...(config.pathConfigs || [])];
        updated[selectedVideoField.index] = { ...updated[selectedVideoField.index], videoUrl: url };
        updateConfig('pathConfigs', updated);
      }
      setVideoPickerOpen(false);
    }
  };

  const loadImages = async () => {
    try {
      setLoadingImages(true);
      const items = await getContentItems();
      const onlyImages = items.filter((it) => Boolean(it.Images));
      setImages(onlyImages);
    } finally {
      setLoadingImages(false);
    }
  };

  const handleUploadImage = async (file: File) => {
    const created = await uploadImage(file);
    if (created) {
      await loadImages();
      const url = getContentImageUrl(created);
      updateConfig('imageUrl', url);
      setImagePickerOpen(false);
    }
  };

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const records = await pb.collection('products').getList(1, 50, {
        sort: '-created'
      });
      setProducts(records.items);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleProductSelect = (product: any) => {
    if (!selectedProductForVideo) return;
    
    const { index, type } = selectedProductForVideo;
    
    if (type === 'main') {
      const updated = [...(config.productVideos || [])];
      updated[index] = { ...updated[index], productId: product.id };
      updateConfig('productVideos', updated);
    }
    
    setProductPickerOpen(false);
    setSelectedProductForVideo(null);
    setProductSearch("");
  };

  const createTester = (type: 'whatsapp' | 'evolution') => async () => {
    if (testing.type) return;
    const recipient = testTarget.trim();
    
    if (!recipient) {
      toast({
        title: 'Set a test number',
        description: 'Enter a recipient number before sending a test message.',
        variant: 'destructive',
      });
      return;
    }

    setTesting({ type });
    try {
      if (type === 'whatsapp') {
        if (!config.instanceId || !config.accessToken) {
          throw new Error('WhatsApp credentials are missing.');
        }

        // This assumes using a proxy or backend endpoint that handles the actual Meta/3rd party API call
        // For direct Meta API calls from browser (not recommended for production due to CORS/Security), logic would differ.
        // Here we simulate a success for demonstration or call a backend endpoint if available.
        // Since we are in the backend admin panel, we might be able to call external APIs directly if CORS allows.
        
        // Implementing direct Meta Graph API call as an example (requires proper CORS setup on Meta app)
        const res = await fetch(`https://graph.facebook.com/v17.0/${config.instanceId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.accessToken}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: recipient,
            type: 'text',
            text: { body: 'Test message from Plugins Manager' },
          }),
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          throw new Error(txt || 'WhatsApp request failed');
        }

      } else { // Evolution API
        if (!config.baseUrl) {
          throw new Error('Evolution API base URL is missing.');
        }

        const instance = config.defaultSender?.trim();
        if (!instance) {
          throw new Error('Specify the Evolution instance ID in the Default Sender field.');
        }

        const url = `${config.baseUrl.replace(/\/$/, '')}/message/sendText/${encodeURIComponent(instance)}`;

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (config.authType === 'header') {
          const headerName = config.authHeader?.trim() || 'apikey';
          if (!config.tokenOrKey) {
            throw new Error(`Provide a value for the ${headerName} header in the Access Token field.`);
          }
          headers[headerName] = config.tokenOrKey;
        } else if (config.authType === 'bearer') {
          if (!config.tokenOrKey) {
            throw new Error('Provide a bearer token in the Access Token field.');
          }
          headers.Authorization = `Bearer ${config.tokenOrKey}`;
        }

        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            number: recipient,
            text: 'Test message from Plugins Manager',
            options: { delay: 250, presence: 'composing' },
          }),
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          throw new Error(txt || 'Evolution API request failed');
        }
      }

      toast({
        title: 'Test request sent',
        description: 'API responded successfully.',
      });
    } catch (error) {
      console.error('API test failed', error);
      toast({
        title: 'Test failed',
        variant: 'destructive',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setTesting({ type: null });
    }
  };

  useEffect(() => {
    loadPlugins();
  }, []);

  useEffect(() => {
    if (selectedPlugin) {
      try {
        const parsed =
          typeof selectedPlugin.config === 'string'
            ? JSON.parse(selectedPlugin.config)
            : selectedPlugin.config || {};
        setConfig(parsed);
      } catch {
        setConfig({});
      }
    }
  }, [selectedPlugin]);

  const togglePlugin = async (pluginKey: PluginKey, enabled: boolean) => {
    try {
      setSaving(true);
      const existing = plugins.find((p) => p.key === pluginKey);

      if (existing) {
        await pb.collection('plugins').update(existing.id, { enabled });
      } else {
        await pb.collection('plugins').create({
          key: pluginKey,
          enabled,
          config: JSON.stringify({}),
        });
      }

      await loadPlugins();
      toast({
        title: 'Success',
        description: `Plugin ${enabled ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      console.error('Failed to toggle plugin:', error);
      toast({
        title: 'Error',
        description: 'Failed to toggle plugin',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const savePluginConfig = async () => {
    if (!selectedPlugin) return;

    try {
      setSaving(true);
      await pb.collection('plugins').update(selectedPlugin.id, {
        config: JSON.stringify(config),
      });

      await loadPlugins();
      toast({
        title: 'Success',
        description: 'Configuration saved',
      });
    } catch (error) {
      console.error('Failed to save config:', error);
      toast({
        title: 'Error',
        description: 'Failed to save configuration',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (key: string, value: any) => {
    setConfig({ ...config, [key]: value });
  };

  const groupedPlugins = Object.entries(PLUGIN_INFO).reduce(
    (acc, [key, info]) => {
      if (!acc[info.category]) {
        acc[info.category] = [];
      }
      const plugin = plugins.find((p) => p.key === key);
      acc[info.category].push({
        key: key as PluginKey,
        ...info,
        enabled: plugin?.enabled || false,
        hasConfig: !!plugin,
        plugin,
      });
      return acc;
    },
    {} as Record<string, any[]>
  );

  const renderConfigEditor = () => {
    if (!selectedPlugin) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Plug size={48} className="text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Plugin Selected</h3>
            <p className="text-muted-foreground">
              Select a plugin to configure its settings
            </p>
          </CardContent>
        </Card>
      );
    }

    const info = PLUGIN_INFO[selectedPlugin.key];

    // Render specific config UI based on plugin type
    switch (selectedPlugin.key) {
      case 'whatsapp_floating':
        return (
          <Card>
            <CardHeader>
              <CardTitle>{info.name} Configuration</CardTitle>
              <CardDescription>{info.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  value={config.phoneNumber || ''}
                  onChange={(e) => updateConfig('phoneNumber', e.target.value)}
                  placeholder="919876543210"
                />
                <p className="text-xs text-muted-foreground">
                  International format without + (e.g., 919876543210)
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="message">Default Message</Label>
                <Textarea
                  id="message"
                  value={config.message || ''}
                  onChange={(e) => updateConfig('message', e.target.value)}
                  placeholder="Hello! I need help."
                  rows={3}
                />
              </div>

              <div className="grid gap-2">
                <Label>Position</Label>
                <div className="flex flex-wrap gap-2">
                  {['bottom-right', 'bottom-left', 'top-right', 'top-left'].map((pos) => (
                    <Button
                      key={pos}
                      type="button"
                      variant={config.position === pos ? 'default' : 'outline'}
                      onClick={() => updateConfig('position', pos)}
                      className="capitalize"
                    >
                      {pos.replace('-', ' ')}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={config.showClose !== false}
                    onCheckedChange={(v) => updateConfig('showClose', v)}
                  />
                  <Label>Show Close</Label>
                </div>
                <div className="grid grid-cols-2 gap-4 flex-1">
                  <div className="grid gap-2">
                    <Label htmlFor="offsetX">Offset X (px)</Label>
                    <Input
                      id="offsetX"
                      type="number"
                      value={config.offsetX ?? 16}
                      onChange={(e) => updateConfig('offsetX', Number(e.target.value))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="offsetY">Offset Y (px)</Label>
                    <Input
                      id="offsetY"
                      type="number"
                      value={config.offsetY ?? 16}
                      onChange={(e) => updateConfig('offsetY', Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="scale">Size (scale 0.5 - 2)</Label>
                <Input
                  id="scale"
                  type="number"
                  step={0.1}
                  min={0.5}
                  max={2}
                  value={config.scale ?? 1}
                  onChange={(e) => updateConfig('scale', Number(e.target.value))}
                />
              </div>

              <div className="space-y-4 border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <Label>Pulsing Ring Animation</Label>
                  <Switch
                    checked={config.showRing !== false}
                    onCheckedChange={(v) => updateConfig('showRing', v)}
                  />
                </div>
                {config.showRing !== false && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="ringColor">Ring Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="ringColor"
                          type="color"
                          value={config.ringColor || '#25D366'}
                          onChange={(e) => updateConfig('ringColor', e.target.value)}
                          className="w-12 p-1 h-10"
                        />
                        <Input
                          value={config.ringColor || '#25D366'}
                          onChange={(e) => updateConfig('ringColor', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="ringWidth">Ring Width (px)</Label>
                      <Input
                        id="ringWidth"
                        type="number"
                        value={config.ringWidth ?? 2}
                        onChange={(e) => updateConfig('ringWidth', Number(e.target.value))}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="buttonColor">Button Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="buttonColor"
                      type="color"
                      value={config.buttonColor || '#25D366'}
                      onChange={(e) => updateConfig('buttonColor', e.target.value)}
                      className="w-12 p-1 h-10"
                    />
                    <Input
                      value={config.buttonColor || '#25D366'}
                      onChange={(e) => updateConfig('buttonColor', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="textColor">Text Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="textColor"
                      type="color"
                      value={config.textColor || '#ffffff'}
                      onChange={(e) => updateConfig('textColor', e.target.value)}
                      className="w-12 p-1 h-10"
                    />
                    <Input
                      value={config.textColor || '#ffffff'}
                      onChange={(e) => updateConfig('textColor', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <Label htmlFor="showLabel">Show Label</Label>
                <Switch
                  id="showLabel"
                  checked={config.showLabel !== false}
                  onCheckedChange={(checked) => updateConfig('showLabel', checked)}
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <Label htmlFor="showOnMobile">Show on Mobile</Label>
                <Switch
                  id="showOnMobile"
                  checked={config.showOnMobile !== false}
                  onCheckedChange={(checked) => updateConfig('showOnMobile', checked)}
                />
              </div>

              {/* Visibility Settings */}
              <div className="space-y-4 border-t pt-4">
                <Label className="text-base font-semibold">Visibility</Label>
                
                <div className="grid gap-2">
                  <Label>Show on pages</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'all', label: 'All pages' },
                      { value: 'homepage', label: 'Homepage only' },
                      { value: 'include', label: 'Include paths' },
                      { value: 'exclude', label: 'Exclude paths' }
                    ].map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={config.visibility?.mode === option.value ? 'default' : 'outline'}
                        onClick={() => updateConfig('visibility', { 
                          ...config.visibility, 
                          mode: option.value 
                        })}
                        size="sm"
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>
                
                {(config.visibility?.mode === 'include' || config.visibility?.mode === 'exclude') && (
                  <div className="grid gap-2 pl-4 border-l-2 border-muted">
                    <Label htmlFor="whatsappVisibilityPaths">
                      {config.visibility?.mode === 'include' ? 'Include paths' : 'Exclude paths'}
                    </Label>
                    <Textarea
                      id="whatsappVisibilityPaths"
                      value={config.visibility?.mode === 'include' 
                        ? (config.visibility?.include || []).join('\n')
                        : (config.visibility?.exclude || []).join('\n')
                      }
                      onChange={(e) => {
                        const paths = e.target.value.split('\n').filter(p => p.trim());
                        updateConfig('visibility', { 
                          ...config.visibility, 
                          [config.visibility?.mode === 'include' ? 'include' : 'exclude']: paths
                        });
                      }}
                      placeholder={`Enter paths one per line, e.g.:\n/\n/shop\n/product/*`}
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter paths one per line. Use * for wildcards (e.g., /product/* for all product pages)
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={savePluginConfig} disabled={saving} className="flex-1">
                  <Save size={16} className="mr-2" />
                  {saving ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'google_analytics':
        return (
          <Card>
            <CardHeader>
              <CardTitle>{info.name} Configuration</CardTitle>
              <CardDescription>{info.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="trackingId">Tracking ID</Label>
                <Input
                  id="trackingId"
                  value={config.trackingId || ''}
                  onChange={(e) => updateConfig('trackingId', e.target.value)}
                  placeholder="G-XXXXXXXXXX or UA-XXXXXXXXX"
                />
                <p className="text-xs text-muted-foreground">
                  Your Google Analytics measurement ID
                </p>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={savePluginConfig} disabled={saving} className="flex-1">
                  <Save size={16} className="mr-2" />
                  {saving ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'facebook_pixel':
        return (
          <Card>
            <CardHeader>
              <CardTitle>{info.name} Configuration</CardTitle>
              <CardDescription>{info.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="pixelId">Pixel ID</Label>
                <Input
                  id="pixelId"
                  value={config.pixelId || ''}
                  onChange={(e) => updateConfig('pixelId', e.target.value)}
                  placeholder="1234567890"
                />
                <p className="text-xs text-muted-foreground">
                  Your Facebook Pixel ID
                </p>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={savePluginConfig} disabled={saving} className="flex-1">
                  <Save size={16} className="mr-2" />
                  {saving ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'evolution_api':
        return (
          <Card>
            <CardHeader>
              <CardTitle>{info.name} Configuration</CardTitle>
              <CardDescription>{info.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="baseUrl">API Base URL</Label>
                <Input
                  id="baseUrl"
                  value={config.baseUrl || ''}
                  onChange={(e) => updateConfig('baseUrl', e.target.value)}
                  placeholder="https://api.evolution-api.com"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="authType">Authentication Type</Label>
                <select
                  id="authType"
                  className="h-10 rounded-md border border-input bg-background px-3"
                  value={config.authType || 'header'}
                  onChange={(e) => updateConfig('authType', e.target.value)}
                >
                  <option value="header">Header (API Key)</option>
                  <option value="bearer">Bearer Token</option>
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="tokenOrKey">Token / API Key</Label>
                <Input
                  id="tokenOrKey"
                  type="password"
                  value={config.tokenOrKey || ''}
                  onChange={(e) => updateConfig('tokenOrKey', e.target.value)}
                  placeholder="Your API Key or Token"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="authHeader">Header Name</Label>
                <Input
                  id="authHeader"
                  value={config.authHeader || 'apikey'}
                  onChange={(e) => updateConfig('authHeader', e.target.value)}
                  placeholder="apikey"
                />
                <p className="text-xs text-muted-foreground">
                  Usually 'apikey' for Evolution API
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="defaultSender">Default Sender Instance</Label>
                <Input
                  id="defaultSender"
                  value={config.defaultSender || ''}
                  onChange={(e) => updateConfig('defaultSender', e.target.value)}
                  placeholder="Instance Name"
                />
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={savePluginConfig} disabled={saving} className="flex-1">
                  <Save size={16} className="mr-2" />
                  {saving ? 'Saving...' : 'Save Configuration'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={createTester('evolution')}
                  disabled={testing.type === 'evolution'}
                >
                  {testing.type === 'evolution' ? 'Sending...' : 'Test'}
                </Button>
              </div>
              
              <div className="grid gap-2 pt-2 border-t">
                <Label htmlFor="testTarget">Test Recipient (Phone)</Label>
                <Input
                  id="testTarget"
                  value={testTarget}
                  onChange={(e) => setTestTarget(e.target.value)}
                  placeholder="Recipient phone number"
                />
                <p className="text-xs text-muted-foreground">
                  Enter a phone number to send a test message
                </p>
              </div>
            </CardContent>
          </Card>
        );

      case 'whatsapp_api':
        return (
          <Card>
            <CardHeader>
              <CardTitle>{info.name} Configuration</CardTitle>
              <CardDescription>{info.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="instanceId">Instance ID</Label>
                <Input
                  id="instanceId"
                  value={config.instanceId || ''}
                  onChange={(e) => updateConfig('instanceId', e.target.value)}
                  placeholder="Instance ID"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="accessToken">Access Token</Label>
                <Input
                  id="accessToken"
                  type="password"
                  value={config.accessToken || ''}
                  onChange={(e) => updateConfig('accessToken', e.target.value)}
                  placeholder="Your Access Token"
                />
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={savePluginConfig} disabled={saving} className="flex-1">
                  <Save size={16} className="mr-2" />
                  {saving ? 'Saving...' : 'Save Configuration'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={createTester('whatsapp')}
                  disabled={testing.type === 'whatsapp'}
                >
                  {testing.type === 'whatsapp' ? 'Sending...' : 'Test'}
                </Button>
              </div>

              <div className="grid gap-2 pt-2 border-t">
                <Label htmlFor="testTargetWa">Test Recipient (Phone)</Label>
                <Input
                  id="testTargetWa"
                  value={testTarget}
                  onChange={(e) => setTestTarget(e.target.value)}
                  placeholder="Recipient phone number"
                />
                <p className="text-xs text-muted-foreground">
                  Enter a phone number to send a test message
                </p>
              </div>
            </CardContent>
          </Card>
        );

      case 'gemini_ai':
        return (
          <Card>
            <CardHeader>
              <CardTitle>{info.name} Configuration</CardTitle>
              <CardDescription>{info.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={config.apiKey || ''}
                  onChange={(e) => updateConfig('apiKey', e.target.value)}
                  placeholder="Your Gemini API Key"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="model">Model</Label>
                <select
                  id="model"
                  className="h-10 rounded-md border border-input bg-background px-3"
                  value={config.model || 'gemini-pro'}
                  onChange={(e) => updateConfig('model', e.target.value)}
                >
                  <option value="gemini-pro">Gemini Pro</option>
                  <option value="gemini-pro-vision">Gemini Pro Vision</option>
                </select>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={savePluginConfig} disabled={saving} className="flex-1">
                  <Save size={16} className="mr-2" />
                  {saving ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'video_floating':
        return (
          <Card>
            <CardHeader>
              <CardTitle>{info.name} Configuration</CardTitle>
              <CardDescription>{info.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Main Video */}
              <div className="space-y-2 border-b pb-4">
                <Label className="text-base font-semibold">Main Video</Label>
                <div className="grid gap-2">
                  <Label htmlFor="videoUrl">Video URL (Fallback)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="videoUrl"
                      value={config.videoUrl || ''}
                      onChange={(e) => updateConfig('videoUrl', e.target.value)}
                      placeholder="https://..."
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSelectedVideoField({ type: 'main' });
                        loadVideos();
                        setVideoPickerOpen(true);
                      }}
                    >
                      <Play size={16} className="mr-2" />
                      Select Video
                    </Button>
                  </div>
                </div>
              </div>

              {/* Product-Specific Videos */}
              <div className="space-y-2 border-b pb-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Product-Specific Videos</Label>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      const updated = [...(config.productVideos || []), { productId: '', videoUrl: '' }];
                      updateConfig('productVideos', updated);
                    }}
                  >
                    <Plus size={16} className="mr-2" />
                    Add Product Video
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Display different videos for specific products
                </p>
                
                {(config.productVideos || []).map((pv: any, index: number) => (
                  <div key={index} className="flex gap-2 items-end border rounded-lg p-3">
                    <div className="flex-1 grid gap-2">
                      <Label>Product</Label>
                      <div className="flex gap-2">
                        <Input
                          value={pv.productId || ''}
                          placeholder="Product ID"
                          readOnly
                          className="bg-muted"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedProductForVideo({ index, type: 'main' });
                            loadProducts();
                            setProductPickerOpen(true);
                          }}
                        >
                          Select
                        </Button>
                      </div>
                    </div>
                    <div className="flex-1 grid gap-2">
                      <Label>Video</Label>
                      <div className="flex gap-2">
                        <Input
                          value={pv.videoUrl || ''}
                          placeholder="Video URL"
                          onChange={(e) => {
                            const updated = [...(config.productVideos || [])];
                            updated[index] = { ...updated[index], videoUrl: e.target.value };
                            updateConfig('productVideos', updated);
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedVideoField({ type: 'product', index });
                            loadVideos();
                            setVideoPickerOpen(true);
                          }}
                        >
                          <Play size={16} />
                        </Button>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        const updated = (config.productVideos || []).filter((_: any, i: number) => i !== index);
                        updateConfig('productVideos', updated);
                      }}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Path-Specific Videos */}
              <div className="space-y-2 border-b pb-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Path-Specific Videos</Label>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      const updated = [...(config.pathConfigs || []), { paths: [''], videoUrl: '' }];
                      updateConfig('pathConfigs', updated);
                    }}
                  >
                    <Plus size={16} className="mr-2" />
                    Add Path Configuration
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Configure different videos for different site sections. Use * for wildcards (e.g., /products/* for all product pages)
                </p>
                
                {(config.pathConfigs || []).map((pathConfig: any, index: number) => (
                  <div key={index} className="border rounded-lg p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="font-medium">Path Configuration #{index + 1}</Label>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          const updated = (config.pathConfigs || []).filter((_: any, i: number) => i !== index);
                          updateConfig('pathConfigs', updated);
                        }}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label>Paths (one per line)</Label>
                      <Textarea
                        value={(pathConfig.paths || []).join('\n')}
                        onChange={(e) => {
                          const paths = e.target.value.split('\n').filter(p => p.trim());
                          const updated = [...(config.pathConfigs || [])];
                          updated[index] = { ...updated[index], paths };
                          updateConfig('pathConfigs', updated);
                        }}
                        placeholder={`Enter paths one per line, e.g.:\n/\n/shop\n/product/*`}
                        rows={3}
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label>Video for these paths</Label>
                      <div className="flex gap-2">
                        <Input
                          value={pathConfig.videoUrl || ''}
                          placeholder="Video URL"
                          onChange={(e) => {
                            const updated = [...(config.pathConfigs || [])];
                            updated[index] = { ...updated[index], videoUrl: e.target.value };
                            updateConfig('pathConfigs', updated);
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedVideoField({ type: 'path', index });
                            loadVideos();
                            setVideoPickerOpen(true);
                          }}
                        >
                          <Play size={16} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Display Settings */}
              <div className="space-y-4 border-b pb-4">
                <Label className="text-base font-semibold">Display Settings</Label>
                
                <div className="grid gap-2">
                  <Label>Position</Label>
                  <div className="flex flex-wrap gap-2">
                    {['bottom-right', 'bottom-left', 'top-right', 'top-left'].map((pos) => (
                      <Button
                        key={pos}
                        type="button"
                        variant={config.position === pos ? 'default' : 'outline'}
                        onClick={() => updateConfig('position', pos)}
                        className="capitalize"
                      >
                        {pos.replace('-', ' ')}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between py-2">
                  <Label htmlFor="autoPlay">Auto Play</Label>
                  <Switch
                    id="autoPlay"
                    checked={config.autoPlay || false}
                    onCheckedChange={(checked) => updateConfig('autoPlay', checked)}
                  />
                </div>

                <div className="flex items-center justify-between py-2">
                  <Label htmlFor="muted">Muted by Default</Label>
                  <Switch
                    id="muted"
                    checked={config.muted !== false}
                    onCheckedChange={(checked) => updateConfig('muted', checked)}
                  />
                </div>

                <div className="flex items-center justify-between py-2">
                  <Label htmlFor="showClose">Show Close Button</Label>
                  <Switch
                    id="showClose"
                    checked={config.showClose !== false}
                    onCheckedChange={(checked) => updateConfig('showClose', checked)}
                  />
                </div>
              </div>

              {/* Responsive Sizing */}
              <div className="space-y-4 border-b pb-4">
                <Label className="text-base font-semibold">Responsive Sizing</Label>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="font-medium">Desktop</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="grid gap-1">
                        <Label htmlFor="desktopWidth" className="text-xs">Width (px)</Label>
                        <Input
                          id="desktopWidth"
                          type="number"
                          value={config.desktop?.width || 320}
                          onChange={(e) => updateConfig('desktop', { 
                            ...config.desktop, 
                            width: parseInt(e.target.value) || 320 
                          })}
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label htmlFor="desktopHeight" className="text-xs">Height (px)</Label>
                        <Input
                          id="desktopHeight"
                          type="number"
                          value={config.desktop?.height || 180}
                          onChange={(e) => updateConfig('desktop', { 
                            ...config.desktop, 
                            height: parseInt(e.target.value) || 180 
                          })}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Label className="font-medium">Mobile</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="grid gap-1">
                        <Label htmlFor="mobileWidth" className="text-xs">Width (px)</Label>
                        <Input
                          id="mobileWidth"
                          type="number"
                          value={config.mobile?.width || 280}
                          onChange={(e) => updateConfig('mobile', { 
                            ...config.mobile, 
                            width: parseInt(e.target.value) || 280 
                          })}
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label htmlFor="mobileHeight" className="text-xs">Height (px)</Label>
                        <Input
                          id="mobileHeight"
                          type="number"
                          value={config.mobile?.height || 160}
                          onChange={(e) => updateConfig('mobile', { 
                            ...config.mobile, 
                            height: parseInt(e.target.value) || 160 
                          })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shop Now Button */}
              <div className="space-y-4 border-b pb-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Shop Now Button</Label>
                  <Switch
                    checked={config.shopNowButton?.enabled || false}
                    onCheckedChange={(checked) => updateConfig('shopNowButton', { 
                      ...config.shopNowButton, 
                      enabled: checked 
                    })}
                  />
                </div>
                
                {config.shopNowButton?.enabled && (
                  <div className="space-y-3 pl-4 border-l-2 border-muted">
                    <div className="grid gap-2">
                      <Label htmlFor="shopNowText">Button Text</Label>
                      <Input
                        id="shopNowText"
                        value={config.shopNowButton?.text || 'Shop Now'}
                        onChange={(e) => updateConfig('shopNowButton', { 
                          ...config.shopNowButton, 
                          text: e.target.value 
                        })}
                        placeholder="Shop Now"
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="shopNowPosition">Position</Label>
                      <select
                        id="shopNowPosition"
                        className="h-10 rounded-md border border-input bg-background px-3"
                        value={config.shopNowButton?.position || 'bottom-right'}
                        onChange={(e) => updateConfig('shopNowButton', { 
                          ...config.shopNowButton, 
                          position: e.target.value 
                        })}
                      >
                        <option value="bottom-left">Bottom Left</option>
                        <option value="bottom-right">Bottom Right</option>
                        <option value="bottom-center">Bottom Center</option>
                      </select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="shopNowBg">Background Color</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={config.shopNowButton?.backgroundColor || '#000000'}
                            onChange={(e) => updateConfig('shopNowButton', { 
                              ...config.shopNowButton, 
                              backgroundColor: e.target.value 
                            })}
                            className="w-12 p-1 h-10"
                          />
                          <Input
                            value={config.shopNowButton?.backgroundColor || '#000000'}
                            onChange={(e) => updateConfig('shopNowButton', { 
                              ...config.shopNowButton, 
                              backgroundColor: e.target.value 
                            })}
                          />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="shopNowText">Text Color</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={config.shopNowButton?.textColor || '#ffffff'}
                            onChange={(e) => updateConfig('shopNowButton', { 
                              ...config.shopNowButton, 
                              textColor: e.target.value 
                            })}
                            className="w-12 p-1 h-10"
                          />
                          <Input
                            value={config.shopNowButton?.textColor || '#ffffff'}
                            onChange={(e) => updateConfig('shopNowButton', { 
                              ...config.shopNowButton, 
                              textColor: e.target.value 
                            })}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="shopNowUrl">Custom URL (optional)</Label>
                      <Input
                        id="shopNowUrl"
                        value={config.shopNowButton?.url || ''}
                        onChange={(e) => updateConfig('shopNowButton', { 
                          ...config.shopNowButton, 
                          url: e.target.value 
                        })}
                        placeholder="Leave empty to use Product ID or enter custom URL"
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="shopNowProductId">Product ID (optional)</Label>
                      <Input
                        id="shopNowProductId"
                        value={config.shopNowButton?.productId || ''}
                        onChange={(e) => updateConfig('shopNowButton', { 
                          ...config.shopNowButton, 
                          productId: e.target.value 
                        })}
                        placeholder="Link to specific product"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Auto-close Settings */}
              <div className="space-y-4 border-b pb-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Auto-close Settings</Label>
                  <Switch
                    checked={config.autoClose || false}
                    onCheckedChange={(checked) => updateConfig('autoClose', checked)}
                  />
                </div>
                
                {config.autoClose && (
                  <div className="grid gap-2 pl-4 border-l-2 border-muted">
                    <Label htmlFor="autoCloseAfter">Auto close after (seconds)</Label>
                    <Input
                      id="autoCloseAfter"
                      type="number"
                      min="0"
                      value={config.autoCloseAfterMs ? config.autoCloseAfterMs / 1000 : 10}
                      onChange={(e) => updateConfig('autoCloseAfterMs', (parseInt(e.target.value) || 10) * 1000)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Video will automatically close after this duration. Set to 0 to disable.
                    </p>
                  </div>
                )}
              </div>

              {/* Visibility Settings */}
              <div className="space-y-4 border-b pb-4">
                <Label className="text-base font-semibold">Visibility</Label>
                
                <div className="grid gap-2">
                  <Label>Show on pages</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'all', label: 'All pages' },
                      { value: 'homepage', label: 'Homepage only' },
                      { value: 'include', label: 'Include paths' },
                      { value: 'exclude', label: 'Exclude paths' }
                    ].map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={config.visibility?.mode === option.value ? 'default' : 'outline'}
                        onClick={() => updateConfig('visibility', { 
                          ...config.visibility, 
                          mode: option.value 
                        })}
                        size="sm"
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>
                
                {(config.visibility?.mode === 'include' || config.visibility?.mode === 'exclude') && (
                  <div className="grid gap-2 pl-4 border-l-2 border-muted">
                    <Label htmlFor="visibilityPaths">
                      {config.visibility?.mode === 'include' ? 'Include paths' : 'Exclude paths'}
                    </Label>
                    <Textarea
                      id="visibilityPaths"
                      value={config.visibility?.mode === 'include' 
                        ? (config.visibility?.include || []).join('\n')
                        : (config.visibility?.exclude || []).join('\n')
                      }
                      onChange={(e) => {
                        const paths = e.target.value.split('\n').filter(p => p.trim());
                        updateConfig('visibility', { 
                          ...config.visibility, 
                          [config.visibility?.mode === 'include' ? 'include' : 'exclude']: paths
                        });
                      }}
                      placeholder={`Enter paths one per line, e.g.:\n/\n/shop\n/product/*`}
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter paths one per line. Use * for wildcards (e.g., /product/* for all product pages)
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={savePluginConfig} disabled={saving} className="flex-1">
                  <Save size={16} className="mr-2" />
                  {saving ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'popup_banner':
        return (
          <Card>
            <CardHeader>
              <CardTitle>{info.name} Configuration</CardTitle>
              <CardDescription>{info.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="imageUrl">Banner Image</Label>
                <div className="flex gap-2">
                  <Input
                    id="imageUrl"
                    value={config.imageUrl || ''}
                    onChange={(e) => updateConfig('imageUrl', e.target.value)}
                    placeholder="https://..."
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      loadImages();
                      setImagePickerOpen(true);
                    }}
                  >
                    <ImageIcon size={16} className="mr-2" />
                    Select Image
                  </Button>
                </div>
                {config.imageUrl && (
                  <div className="mt-2 rounded-lg border overflow-hidden">
                    <img 
                      src={config.imageUrl} 
                      alt="Banner preview" 
                      className="w-full max-h-48 object-contain bg-muted"
                    />
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="linkUrl">Link URL (Click Target)</Label>
                <Input
                  id="linkUrl"
                  value={config.linkUrl || ''}
                  onChange={(e) => updateConfig('linkUrl', e.target.value)}
                  placeholder="https://... or /product/xyz"
                />
                <p className="text-xs text-muted-foreground">
                  Where users go when clicking the banner
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="delay">Show After Delay (seconds)</Label>
                <Input
                  id="delay"
                  type="number"
                  min="0"
                  value={config.delay || 0}
                  onChange={(e) => updateConfig('delay', parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Wait time before showing the popup (0 = immediate)
                </p>
              </div>

              <div className="flex items-center justify-between py-2">
                <Label htmlFor="showOnce">Show Only Once Per Session</Label>
                <Switch
                  id="showOnce"
                  checked={config.showOnce || false}
                  onCheckedChange={(checked) => updateConfig('showOnce', checked)}
                />
              </div>

              {/* Visibility Settings */}
              <div className="space-y-4 border-t pt-4">
                <Label className="text-base font-semibold">Visibility</Label>
                
                <div className="grid gap-2">
                  <Label>Show on pages</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'all', label: 'All pages' },
                      { value: 'homepage', label: 'Homepage only' },
                      { value: 'include', label: 'Include paths' },
                      { value: 'exclude', label: 'Exclude paths' }
                    ].map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={config.visibility?.mode === option.value ? 'default' : 'outline'}
                        onClick={() => updateConfig('visibility', { 
                          ...config.visibility, 
                          mode: option.value 
                        })}
                        size="sm"
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>
                
                {(config.visibility?.mode === 'include' || config.visibility?.mode === 'exclude') && (
                  <div className="grid gap-2 pl-4 border-l-2 border-muted">
                    <Label htmlFor="popupVisibilityPaths">
                      {config.visibility?.mode === 'include' ? 'Include paths' : 'Exclude paths'}
                    </Label>
                    <Textarea
                      id="popupVisibilityPaths"
                      value={config.visibility?.mode === 'include' 
                        ? (config.visibility?.include || []).join('\n')
                        : (config.visibility?.exclude || []).join('\n')
                      }
                      onChange={(e) => {
                        const paths = e.target.value.split('\n').filter(p => p.trim());
                        updateConfig('visibility', { 
                          ...config.visibility, 
                          [config.visibility?.mode === 'include' ? 'include' : 'exclude']: paths
                        });
                      }}
                      placeholder={`Enter paths one per line, e.g.:\n/\n/shop\n/product/*`}
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter paths one per line. Use * for wildcards (e.g., /product/* for all product pages)
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={savePluginConfig} disabled={saving} className="flex-1">
                  <Save size={16} className="mr-2" />
                  {saving ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'google_tag_manager':
        return (
          <Card>
            <CardHeader>
              <CardTitle>{info.name} Configuration</CardTitle>
              <CardDescription>{info.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="containerId">Container ID</Label>
                <Input
                  id="containerId"
                  value={config.containerId || ''}
                  onChange={(e) => updateConfig('containerId', e.target.value)}
                  placeholder="GTM-XXXXXXX"
                />
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={savePluginConfig} disabled={saving} className="flex-1">
                  <Save size={16} className="mr-2" />
                  {saving ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'microsoft_clarity':
        return (
          <Card>
            <CardHeader>
              <CardTitle>{info.name} Configuration</CardTitle>
              <CardDescription>{info.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="projectId">Project ID</Label>
                <Input
                  id="projectId"
                  value={config.projectId || ''}
                  onChange={(e) => updateConfig('projectId', e.target.value)}
                  placeholder="XXXXXXXXXX"
                />
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={savePluginConfig} disabled={saving} className="flex-1">
                  <Save size={16} className="mr-2" />
                  {saving ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'custom_scripts':
        return (
          <Card>
            <CardHeader>
              <CardTitle>{info.name} Configuration</CardTitle>
              <CardDescription>{info.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="headScript">Head Scripts</Label>
                <Textarea
                  id="headScript"
                  value={config.headScripts || ''}
                  onChange={(e) => updateConfig('headScripts', e.target.value)}
                  placeholder="<script>...</script>"
                  rows={6}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Scripts to inject in the &lt;head&gt; tag
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="bodyScript">Body Scripts</Label>
                <Textarea
                  id="bodyScript"
                  value={config.bodyScripts || ''}
                  onChange={(e) => updateConfig('bodyScripts', e.target.value)}
                  placeholder="<script>...</script>"
                  rows={6}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Scripts to inject before closing &lt;/body&gt; tag
                </p>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={savePluginConfig} disabled={saving} className="flex-1">
                  <Save size={16} className="mr-2" />
                  {saving ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return (
          <Card>
            <CardHeader>
              <CardTitle>{info.name} Configuration</CardTitle>
              <CardDescription>{info.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Configuration (JSON)</Label>
                <Textarea
                  value={JSON.stringify(config, null, 2)}
                  onChange={(e) => {
                    try {
                      setConfig(JSON.parse(e.target.value));
                    } catch {}
                  }}
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={savePluginConfig} disabled={saving} className="flex-1">
                  <Save size={16} className="mr-2" />
                  {saving ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading plugins...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Plug className="h-8 w-8" />
              Plugins Manager
            </h1>
            <p className="text-muted-foreground mt-1">
              Enable and configure plugins to extend your store functionality
            </p>
          </div>
          <Button
            onClick={loadPlugins}
            variant="outline"
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">All Plugins</TabsTrigger>
            <TabsTrigger value="communication">Communication</TabsTrigger>
            <TabsTrigger value="marketing">Marketing</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Plugin List */}
              <div className="lg:col-span-1 space-y-3">
                {Object.values(groupedPlugins)
                  .flat()
                  .map((item) => {
                    const Icon = item.icon;
                    return (
                      <Card
                        key={item.key}
                        className={`cursor-pointer transition-colors ${
                          selectedPlugin?.key === item.key ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => item.plugin && setSelectedPlugin(item.plugin)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <Icon className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <CardTitle className="text-sm">{item.name}</CardTitle>
                                <CardDescription className="text-xs mt-1">
                                  {item.description}
                                </CardDescription>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center justify-between">
                            <Switch
                              checked={item.enabled}
                              onCheckedChange={(checked) =>
                                togglePlugin(item.key, checked)
                              }
                              disabled={saving}
                            />
                            {item.enabled && (
                              <Badge variant="default" className="text-xs">
                                Active
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>

              {/* Config Editor */}
              <div className="lg:col-span-2">{renderConfigEditor()}</div>
            </div>
          </TabsContent>

          {['communication', 'marketing', 'analytics', 'advanced'].map((category) => (
            <TabsContent key={category} value={category} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedPlugins[category]?.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Card key={item.key}>
                      <CardHeader>
                        <div className="flex items-center gap-3 mb-2">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                          <CardTitle className="text-base">{item.name}</CardTitle>
                        </div>
                        <CardDescription>{item.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <Switch
                            checked={item.enabled}
                            onCheckedChange={(checked) => togglePlugin(item.key, checked)}
                            disabled={saving}
                          />
                          {item.hasConfig && item.enabled && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => item.plugin && setSelectedPlugin(item.plugin)}
                            >
                              Configure
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Video Picker Dialog */}
      <Dialog open={videoPickerOpen} onOpenChange={setVideoPickerOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Video</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Input
                type="file"
                accept="video/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleUploadVideo(e.target.files[0]);
                }}
                className="hidden"
                id="video-upload"
              />
              <Label
                htmlFor="video-upload"
                className="flex items-center gap-2 cursor-pointer bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
              >
                <Upload size={16} />
                Upload New Video
              </Label>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {loadingVideos ? (
                <div className="col-span-full text-center py-8">Loading videos...</div>
              ) : videos.length === 0 ? (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No videos found. Upload one to get started.
                </div>
              ) : (
                videos.map((item) => {
                  const url = getContentVideoUrl(item);
                  return (
                    <div
                      key={item.id}
                      className="relative group cursor-pointer border rounded-md overflow-hidden aspect-video bg-black/10"
                      onClick={() => {
                        if (selectedVideoField?.type === 'main') {
                          updateConfig('videoUrl', url);
                        } else if (selectedVideoField?.type === 'product' && selectedVideoField.index !== undefined) {
                          const updated = [...(config.productVideos || [])];
                          updated[selectedVideoField.index] = { ...updated[selectedVideoField.index], videoUrl: url };
                          updateConfig('productVideos', updated);
                        } else if (selectedVideoField?.type === 'path' && selectedVideoField.index !== undefined) {
                          const updated = [...(config.pathConfigs || [])];
                          updated[selectedVideoField.index] = { ...updated[selectedVideoField.index], videoUrl: url };
                          updateConfig('pathConfigs', updated);
                        }
                        setVideoPickerOpen(false);
                      }}
                    >
                      <video src={url} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="text-white font-medium">Select</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Picker Dialog */}
      <Dialog open={imagePickerOpen} onOpenChange={setImagePickerOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleUploadImage(e.target.files[0]);
                }}
                className="hidden"
                id="image-upload"
              />
              <Label
                htmlFor="image-upload"
                className="flex items-center gap-2 cursor-pointer bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
              >
                <Upload size={16} />
                Upload New Image
              </Label>
            </div>
            
            <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
              {loadingImages ? (
                <div className="col-span-full text-center py-8">Loading images...</div>
              ) : images.length === 0 ? (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No images found. Upload one to get started.
                </div>
              ) : (
                images.map((item) => {
                  const url = getContentImageUrl(item);
                  return (
                    <div
                      key={item.id}
                      className="relative group cursor-pointer border rounded-md overflow-hidden aspect-square bg-black/5"
                      onClick={() => {
                        updateConfig('imageUrl', url);
                        setImagePickerOpen(false);
                      }}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="text-white font-medium">Select</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product Picker Dialog */}
      <Dialog open={productPickerOpen} onOpenChange={setProductPickerOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <div className="border rounded-md divide-y max-h-[400px] overflow-y-auto">
              {loadingProducts ? (
                <div className="p-4 text-center">Loading products...</div>
              ) : products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">No products found.</div>
              ) : (
                products
                  .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                  .map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 hover:bg-accent cursor-pointer"
                      onClick={() => handleProductSelect(product)}
                    >
                      <div className="flex items-center gap-3">
                        {product.image ? (
                          <img 
                            src={pb.files.getURL(product, product.image)} 
                            alt={product.name} 
                            className="w-10 h-10 rounded object-cover bg-muted"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                            <span className="text-xs">Img</span>
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                            {product.id}
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost">Select</Button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
