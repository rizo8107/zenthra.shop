import React, { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  getAllPlugins,
  savePluginConfig,
  togglePlugin,
  parseConfigForKey,
  type PluginKey,
  type WhatsAppPluginConfig,
  type VideoPluginConfig,
  type PopupBannerConfig,
  type GoogleAnalyticsConfig,
  type GoogleTagManagerConfig,
  type FacebookPixelConfig,
  type MicrosoftClarityConfig,
  type CustomScriptsConfig,
  type PluginRecord,
} from '@/lib/plugins';

const PLUGINS: { key: PluginKey; label: string; group?: 'analytics' | 'custom' }[] = [
  { key: 'whatsapp_floating', label: 'WhatsApp Floating' },
  { key: 'video_floating', label: 'Video Floating' },
  { key: 'popup_banner', label: 'Popup Banner' },
  { key: 'google_analytics', label: 'Google Analytics', group: 'analytics' },
  { key: 'google_tag_manager', label: 'Google Tag Manager', group: 'analytics' },
  { key: 'facebook_pixel', label: 'Facebook Pixel', group: 'analytics' },
  { key: 'microsoft_clarity', label: 'Microsoft Clarity', group: 'analytics' },
  { key: 'custom_scripts', label: 'Custom Scripts', group: 'custom' },
];

const ZenthraPlugins: React.FC = () => {
  const [records, setRecords] = useState<PluginRecord[]>([]);
  const [selected, setSelected] = useState<PluginKey>('whatsapp_floating');
  const [saving, setSaving] = useState(false);

  // Map helpers
  const enabledMap = useMemo(() => {
    const m: Record<PluginKey, boolean> = {
      whatsapp_floating: false,
      video_floating: false,
      popup_banner: false,
      google_analytics: false,
      google_tag_manager: false,
      facebook_pixel: false,
      microsoft_clarity: false,
      custom_scripts: false,
    } as any;
    records.forEach(r => { m[r.key] = Boolean(r.enabled); });
    return m;
  }, [records]);

  const configMap = useMemo(() => {
    const m: Record<PluginKey, any> = {} as any;
    records.forEach(r => { m[r.key] = parseConfigForKey(r.key, r.config); });
    return m;
  }, [records]);

  const cfg = (key: PluginKey) => (configMap[key] || {}) as any;
  const isEnabled = (key: PluginKey) => Boolean(enabledMap[key]);

  useEffect(() => {
    (async () => {
      const list = await getAllPlugins();
      setRecords(list);
    })();
  }, []);

  const setConfig = (key: PluginKey, data: any) => {
    setRecords(prev => prev.map(r => r.key === key ? { ...r, config: { ...(typeof r.config === 'object' ? r.config : {}), ...data } } : r));
  };

  const onToggle = async (key: PluginKey, value: boolean) => {
    await togglePlugin(key, value);
    const list = await getAllPlugins();
    setRecords(list);
  };

  const onSave = async (key: PluginKey) => {
    setSaving(true);
    try {
      await savePluginConfig(key, cfg(key));
      const list = await getAllPlugins();
      setRecords(list);
    } finally {
      setSaving(false);
    }
  };

  const Sidebar = () => (
    <aside className="w-64 shrink-0">
      <div className="rounded-md border bg-card">
        <div className="p-3 border-b text-sm font-medium">Plugins</div>
        <nav className="p-2 space-y-1">
          {PLUGINS.map(p => (
            <button
              key={p.key}
              type="button"
              className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent ${selected === p.key ? 'bg-accent' : ''}`}
              onClick={() => setSelected(p.key)}
            >
              <span>{p.label}</span>
              <Switch checked={isEnabled(p.key)} onCheckedChange={(v) => onToggle(p.key, v)} />
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );

  const WhatsAppForm = () => {
    const c = { enabled: isEnabled('whatsapp_floating'), position: 'bottom-right', ...cfg('whatsapp_floating') } as WhatsAppPluginConfig;
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>WhatsApp Floating Button</CardTitle>
          <div className="flex items-center gap-2">
            <Label className="text-sm">Enabled</Label>
            <Switch checked={isEnabled('whatsapp_floating')} onCheckedChange={(v) => onToggle('whatsapp_floating', v)} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Phone Number (without +)</Label>
            <Input value={c.phoneNumber || ''} onChange={(e)=>setConfig('whatsapp_floating',{ phoneNumber: e.target.value })} placeholder="919999999999" />
          </div>
          <div className="grid gap-2">
            <Label>Default Message</Label>
            <Input value={c.message || ''} onChange={(e)=>setConfig('whatsapp_floating',{ message: e.target.value })} placeholder="Hello! I need help." />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Button Color</Label>
              <Input value={c.buttonColor || ''} onChange={(e)=>setConfig('whatsapp_floating',{ buttonColor: e.target.value })} placeholder="#25D366" />
            </div>
            <div className="grid gap-2">
              <Label>Text Color</Label>
              <Input value={c.textColor || ''} onChange={(e)=>setConfig('whatsapp_floating',{ textColor: e.target.value })} placeholder="#ffffff" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={()=>onSave('whatsapp_floating')} disabled={saving}>{saving?'Saving…':'Save'}</Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const VideoForm = () => {
    const c = { enabled: isEnabled('video_floating'), position: 'bottom-right', ...cfg('video_floating') } as VideoPluginConfig;
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Video Floating</CardTitle>
          <div className="flex items-center gap-2">
            <Label className="text-sm">Enabled</Label>
            <Switch checked={isEnabled('video_floating')} onCheckedChange={(v) => onToggle('video_floating', v)} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Video URL (YouTube embed or MP4)</Label>
            <Input value={c.videoUrl || ''} onChange={(e)=>setConfig('video_floating',{ videoUrl: e.target.value })} placeholder="https://www.youtube.com/embed/... or https://.../video.mp4" />
          </div>
          <div className="flex gap-2">
            <Button onClick={()=>onSave('video_floating')} disabled={saving}>{saving?'Saving…':'Save'}</Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const PopupForm = () => {
    const c = { enabled: isEnabled('popup_banner'), title: 'Welcome!', ...cfg('popup_banner') } as PopupBannerConfig;
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Popup Banner</CardTitle>
          <div className="flex items-center gap-2">
            <Label className="text-sm">Enabled</Label>
            <Switch checked={isEnabled('popup_banner')} onCheckedChange={(v) => onToggle('popup_banner', v)} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Title</Label>
            <Input value={c.title || ''} onChange={(e)=>setConfig('popup_banner',{ title: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label>Subtitle</Label>
            <Input value={c.subtitle || ''} onChange={(e)=>setConfig('popup_banner',{ subtitle: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label>Image URL</Label>
            <Input value={c.imageUrl || ''} onChange={(e)=>setConfig('popup_banner',{ imageUrl: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button onClick={()=>onSave('popup_banner')} disabled={saving}>{saving?'Saving…':'Save'}</Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const AnalyticsForm = ({ keyName, label, field }: { keyName: PluginKey; label: string; field: string }) => {
    const c = { enabled: isEnabled(keyName), [field]: '', ...cfg(keyName) } as GoogleAnalyticsConfig & GoogleTagManagerConfig & FacebookPixelConfig & MicrosoftClarityConfig;
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{label}</CardTitle>
          <div className="flex items-center gap-2">
            <Label className="text-sm">Enabled</Label>
            <Switch checked={isEnabled(keyName)} onCheckedChange={(v) => onToggle(keyName, v)} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>{field}</Label>
            <Input value={(c as any)[field] || ''} onChange={(e)=>setConfig(keyName,{ [field]: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button onClick={()=>onSave(keyName)} disabled={saving}>{saving?'Saving…':'Save'}</Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const CustomScriptsForm = () => {
    const c = { enabled: isEnabled('custom_scripts'), scripts: [], ...cfg('custom_scripts') } as CustomScriptsConfig;
    const serialized = useMemo(()=>JSON.stringify(c.scripts || [], null, 2), [c.scripts]);
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Custom Scripts</CardTitle>
          <div className="flex items-center gap-2">
            <Label className="text-sm">Enabled</Label>
            <Switch checked={isEnabled('custom_scripts')} onCheckedChange={(v) => onToggle('custom_scripts', v)} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Scripts JSON (array)</Label>
            <textarea
              className="h-40 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
              value={serialized}
              onChange={(e)=>{
                try { setConfig('custom_scripts', { scripts: JSON.parse(e.target.value) }); } catch {}
              }}
              rows={8}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={()=>onSave('custom_scripts')} disabled={saving}>{saving?'Saving…':'Save'}</Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const Detail = () => {
    switch (selected) {
      case 'whatsapp_floating': return <WhatsAppForm />;
      case 'video_floating': return <VideoForm />;
      case 'popup_banner': return <PopupForm />;
      case 'google_analytics': return <AnalyticsForm keyName="google_analytics" label="Google Analytics" field="measurementId" />;
      case 'google_tag_manager': return <AnalyticsForm keyName="google_tag_manager" label="Google Tag Manager" field="containerId" />;
      case 'facebook_pixel': return <AnalyticsForm keyName="facebook_pixel" label="Facebook Pixel" field="pixelId" />;
      case 'microsoft_clarity': return <AnalyticsForm keyName="microsoft_clarity" label="Microsoft Clarity" field="projectId" />;
      case 'custom_scripts': return <CustomScriptsForm />;
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Plugin Manager</h1>
          <p className="text-muted-foreground mt-1">Enable and configure global plugins.</p>
        </div>
        <div className="flex gap-6">
          <Sidebar />
          <section className="flex-1 space-y-6">
            <Detail />
          </section>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ZenthraPlugins;
