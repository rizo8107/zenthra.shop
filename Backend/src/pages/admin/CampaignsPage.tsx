import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Upload, Play, Pause, RotateCcw, Download, MessageSquare, Users, CheckCircle, XCircle, Clock, Send, FileSpreadsheet, Eye, Timer, TrendingUp, AlertCircle, Wifi, WifiOff, FileDown, RefreshCw, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { pb } from '@/lib/pocketbase';

const SAMPLE_CSV = `phone,name,tracking_link,order_id,amount
9876543210,John Doe,https://track.example.com/ABC123,ORD001,599
9876543211,Jane Smith,https://track.example.com/DEF456,ORD002,1299
9876543212,Ravi Kumar,https://track.example.com/GHI789,ORD003,899`;

function parseCsvDynamic(content: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = cols[idx] || ''; });
    if (row.phone || row.Phone || row.PHONE || row.mobile || row.Mobile) {
      row.phone = row.phone || row.Phone || row.PHONE || row.mobile || row.Mobile || '';
      rows.push(row);
    }
  }
  return { headers, rows };
}

function renderTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

function formatPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) cleaned = '91' + cleaned;
  return cleaned;
}

interface EvolutionConfig { baseUrl: string; apiKey: string; instanceName: string; connected: boolean; }
interface CustomCampaignState { contacts: Record<string, string>[]; headers: string[]; message: string; mediaUrl: string; mediaType: 'image' | 'video' | 'document'; intervalMs: number; retries: number; status: 'idle' | 'running' | 'paused' | 'completed' | 'stopped'; currentIndex: number; logs: CustomLogItem[]; startTime: number | null; }
interface CustomLogItem { index: number; phone: string; name: string; status: 'pending' | 'sending' | 'success' | 'failed'; attempt: number; message: string; sentAt?: string; renderedMessage?: string; }

const CampaignsPage: React.FC = () => {
  const { toast } = useToast();
  const [evolutionConfig, setEvolutionConfig] = useState<EvolutionConfig>({ baseUrl: '', apiKey: '', instanceName: '', connected: false });
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [customState, setCustomState] = useState<CustomCampaignState>({ contacts: [], headers: [], message: '', mediaUrl: '', mediaType: 'image', intervalMs: 2000, retries: 1, status: 'idle', currentIndex: 0, logs: [], startTime: null });
  const [customCsvName, setCustomCsvName] = useState('');
  const stopRef = useRef(false);
  const pauseRef = useRef(false);

  const loadEvolutionConfig = useCallback(async () => {
    try {
      setLoadingConfig(true);
      const plugins = await pb.collection('plugins').getFullList();
      const evolutionPlugin = plugins.find((p: any) => p.key === 'evolution_api');
      if (evolutionPlugin?.config) {
        const parsed = typeof evolutionPlugin.config === 'string' ? JSON.parse(evolutionPlugin.config) : evolutionPlugin.config;
        setEvolutionConfig({ baseUrl: parsed.baseUrl || '', apiKey: parsed.tokenOrKey || '', instanceName: parsed.defaultSender || '', connected: false });
      }
    } catch (error) { console.error('Failed to load Evolution config:', error); }
    finally { setLoadingConfig(false); }
  }, []);

  const checkConnection = async () => {
    if (!evolutionConfig.baseUrl || !evolutionConfig.apiKey || !evolutionConfig.instanceName) {
      toast({ title: 'Configuration Missing', description: 'Please configure Evolution API in WhatsApp settings first', variant: 'destructive' });
      return;
    }
    try {
      setCheckingConnection(true);
      const url = `${evolutionConfig.baseUrl.replace(/\/$/, '')}/instance/connectionState/${evolutionConfig.instanceName}`;
      const response = await fetch(url, { headers: { 'apikey': evolutionConfig.apiKey } });
      if (response.ok) {
        const data = await response.json();
        const state = data.instance?.state || data.state || 'unknown';
        setEvolutionConfig(prev => ({ ...prev, connected: state === 'open' }));
        if (state === 'open') toast({ title: 'Connected', description: 'WhatsApp is connected and ready' });
        else toast({ title: 'Not Connected', description: `WhatsApp status: ${state}`, variant: 'destructive' });
      } else throw new Error('Failed');
    } catch (error) {
      setEvolutionConfig(prev => ({ ...prev, connected: false }));
      toast({ title: 'Connection Error', description: 'Failed to check WhatsApp connection', variant: 'destructive' });
    } finally { setCheckingConnection(false); }
  };

  const sendMessage = async (phone: string, message: string, mediaUrl?: string, mediaType?: string): Promise<boolean> => {
    const formattedPhone = formatPhone(phone);
    const baseUrl = evolutionConfig.baseUrl.replace(/\/$/, '');
    try {
      if (mediaUrl) {
        const response = await fetch(`${baseUrl}/message/sendMedia/${evolutionConfig.instanceName}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'apikey': evolutionConfig.apiKey }, body: JSON.stringify({ number: formattedPhone, mediatype: mediaType || 'image', media: mediaUrl, caption: message }) });
        return response.ok;
      } else {
        const response = await fetch(`${baseUrl}/message/sendText/${evolutionConfig.instanceName}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'apikey': evolutionConfig.apiKey }, body: JSON.stringify({ number: formattedPhone, text: message }) });
        return response.ok;
      }
    } catch (error) { return false; }
  };

  useEffect(() => { loadEvolutionConfig(); }, [loadEvolutionConfig]);

  const customStats = useMemo(() => {
    const sent = customState.logs.filter(l => l.status === 'success').length;
    const failed = customState.logs.filter(l => l.status === 'failed').length;
    const pending = customState.contacts.length - customState.currentIndex;
    const total = customState.contacts.length;
    const progress = total > 0 ? Math.round((customState.currentIndex / total) * 100) : 0;
    let eta = '';
    if (customState.status === 'running' && customState.startTime && customState.currentIndex > 0) {
      const elapsed = Date.now() - customState.startTime;
      const avgPerMessage = elapsed / customState.currentIndex;
      const remaining = (total - customState.currentIndex) * avgPerMessage;
      eta = `${Math.floor(remaining / 60000)}m ${Math.floor((remaining % 60000) / 1000)}s`;
    }
    return { sent, failed, pending, total, progress, eta };
  }, [customState.logs, customState.contacts.length, customState.currentIndex, customState.status, customState.startTime]);

  const previewMessage = useMemo(() => {
    if (customState.contacts.length === 0 || !customState.message) return customState.message || 'Your message preview will appear here...';
    return renderTemplate(customState.message, customState.contacts[0]);
  }, [customState.contacts, customState.message]);

  const handleCustomCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const text = await f.text();
    setCustomCsvName(f.name);
    const { headers, rows } = parseCsvDynamic(text);
    setCustomState(prev => ({ ...prev, contacts: rows, headers, logs: rows.map((r, i) => ({ index: i, phone: r.phone, name: r.name || r.Name || r.customer_name || '', status: 'pending' as const, attempt: 0, message: 'Pending' })), currentIndex: 0, status: 'idle', startTime: null }));
    toast({ title: 'CSV Loaded', description: `${rows.length} contacts with ${headers.length} variables` });
  };

  const downloadSampleCsv = () => { const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'sample_campaign.csv'; a.click(); URL.revokeObjectURL(url); };
  const insertVariable = (variable: string) => { setCustomState(prev => ({ ...prev, message: prev.message + `{{${variable}}}` })); };

  const startCustomCampaign = useCallback(async () => {
    if (customState.contacts.length === 0 || !customState.message) return;
    if (!evolutionConfig.connected) { toast({ title: 'Not Connected', description: 'Please check WhatsApp connection first', variant: 'destructive' }); return; }
    stopRef.current = false; pauseRef.current = false;
    setCustomState(prev => ({ ...prev, status: 'running', startTime: prev.startTime || Date.now() }));
    for (let i = customState.currentIndex; i < customState.contacts.length; i++) {
      if (stopRef.current) { setCustomState(prev => ({ ...prev, status: 'stopped' })); break; }
      while (pauseRef.current) { await new Promise(r => setTimeout(r, 500)); if (stopRef.current) break; }
      if (stopRef.current) { setCustomState(prev => ({ ...prev, status: 'stopped' })); break; }
      const contact = customState.contacts[i];
      const renderedMessage = renderTemplate(customState.message, contact);
      setCustomState(prev => { const newLogs = [...prev.logs]; newLogs[i] = { ...newLogs[i], status: 'sending', attempt: 1 }; return { ...prev, logs: newLogs, currentIndex: i + 1 }; });
      let success = false, attempt = 0, lastError = '';
      while (attempt < customState.retries && !success) {
        attempt++;
        try { success = await sendMessage(contact.phone, renderedMessage, customState.mediaUrl || undefined, customState.mediaType); if (!success) lastError = 'API error'; }
        catch (err: any) { lastError = err?.message || 'Failed'; if (attempt < customState.retries) await new Promise(r => setTimeout(r, 1000)); }
      }
      setCustomState(prev => { const newLogs = [...prev.logs]; newLogs[i] = { ...newLogs[i], status: success ? 'success' : 'failed', attempt, message: success ? 'Sent' : lastError, sentAt: new Date().toLocaleTimeString(), renderedMessage }; return { ...prev, logs: newLogs }; });
      if (i < customState.contacts.length - 1) await new Promise(r => setTimeout(r, customState.intervalMs));
    }
    if (!stopRef.current && !pauseRef.current) { setCustomState(prev => ({ ...prev, status: 'completed' })); toast({ title: 'Campaign Completed', description: `Sent to ${customStats.sent + 1} contacts` }); }
  }, [customState, evolutionConfig.connected, customStats.sent, toast]);

  const pauseCustomCampaign = () => { pauseRef.current = true; setCustomState(prev => ({ ...prev, status: 'paused' })); };
  const resumeCustomCampaign = () => { pauseRef.current = false; startCustomCampaign(); };
  const stopCustomCampaign = () => { stopRef.current = true; pauseRef.current = false; setCustomState(prev => ({ ...prev, status: 'stopped' })); };
  const resetCustomCampaign = () => { stopRef.current = true; pauseRef.current = false; setCustomState(prev => ({ ...prev, status: 'idle', currentIndex: 0, startTime: null, logs: prev.contacts.map((r, i) => ({ index: i, phone: r.phone, name: r.name || r.Name || r.customer_name || '', status: 'pending' as const, attempt: 0, message: 'Pending' })) })); };
  const exportResults = () => { const headers = ['Phone', 'Name', 'Status', 'Attempts', 'Message', 'Sent At']; const rows = customState.logs.map(l => [l.phone, l.name, l.status, l.attempt, l.message, l.sentAt || '']); const csv = [headers, ...rows].map(r => r.join(',')).join('\n'); const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `campaign_results_${new Date().toISOString().split('T')[0]}.csv`; a.click(); URL.revokeObjectURL(url); };

  return (
    <AdminLayout>
      <div className="sticky top-0 z-30 w-full border-b bg-background/70 backdrop-blur" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <MessageSquare className="h-6 w-6 text-green-500" />
          <h1 className="flex-1 truncate text-xl font-semibold sm:text-2xl">Bulk WhatsApp Campaign</h1>
        </div>
      </div>
      <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-4 space-y-4">
        <Alert variant={evolutionConfig.connected ? 'default' : 'destructive'}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {evolutionConfig.connected ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4" />}
              <div>
                <AlertTitle>{loadingConfig ? 'Loading...' : evolutionConfig.connected ? 'WhatsApp Connected' : 'WhatsApp Not Connected'}</AlertTitle>
                <AlertDescription className="text-xs">{evolutionConfig.instanceName ? `Instance: ${evolutionConfig.instanceName}` : 'No instance configured'}</AlertDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={checkConnection} disabled={checkingConnection || loadingConfig}>{checkingConnection ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Check</Button>
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/admin/whatsapp'}><Settings className="h-4 w-4 mr-1" /> Configure</Button>
            </div>
          </div>
        </Alert>
        <div className="grid gap-4 md:grid-cols-5">
          <Card><CardHeader className="pb-2"><CardDescription>Total Contacts</CardDescription><CardTitle className="text-2xl flex items-center gap-2"><Users className="h-5 w-5 text-blue-500" />{customStats.total}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Sent</CardDescription><CardTitle className="text-2xl flex items-center gap-2 text-green-600"><CheckCircle className="h-5 w-5" />{customStats.sent}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Failed</CardDescription><CardTitle className="text-2xl flex items-center gap-2 text-red-600"><XCircle className="h-5 w-5" />{customStats.failed}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Pending</CardDescription><CardTitle className="text-2xl flex items-center gap-2 text-yellow-600"><Clock className="h-5 w-5" />{customStats.pending}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>ETA</CardDescription><CardTitle className="text-2xl flex items-center gap-2"><Timer className="h-5 w-5 text-purple-500" />{customStats.eta || '--'}</CardTitle></CardHeader></Card>
        </div>
        {customState.status !== 'idle' && (
          <Card><CardContent className="pt-4"><div className="space-y-2"><div className="flex items-center justify-between text-sm"><Badge variant={customState.status === 'running' ? 'default' : customState.status === 'paused' ? 'secondary' : customState.status === 'completed' ? 'default' : 'destructive'}>{customState.status === 'running' && <Send className="h-3 w-3 mr-1 animate-pulse" />}{customState.status.toUpperCase()}</Badge><span className="font-medium">{customStats.progress}%</span></div><Progress value={customStats.progress} className="h-3" /><div className="text-xs text-muted-foreground">Processing {customState.currentIndex} of {customStats.total} contacts</div></div></CardContent></Card>
        )}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Upload className="h-5 w-5" />1. Upload Customer Data</CardTitle><CardDescription>Upload CSV with phone number and any custom variables</CardDescription></CardHeader><CardContent className="space-y-3"><div className="flex items-center gap-2"><Input type="file" accept=".csv" onChange={handleCustomCsvUpload} className="flex-1" /><Button variant="outline" size="sm" onClick={downloadSampleCsv}><FileDown className="h-4 w-4 mr-1" />Sample</Button></div>{customCsvName && <div className="text-sm text-muted-foreground">Loaded: <b>{customState.contacts.length}</b> contacts from <b>{customCsvName}</b></div>}{customState.headers.length > 0 && <div className="space-y-2"><Label className="text-xs">Detected Variables (click to insert):</Label><div className="flex flex-wrap gap-1">{customState.headers.map(h => <Badge key={h} variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground" onClick={() => insertVariable(h)}>{`{{${h}}}`}</Badge>)}</div></div>}</CardContent></Card>
            <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><MessageSquare className="h-5 w-5" />2. Compose Message</CardTitle><CardDescription>Use {'{{variable}}'} placeholders from your CSV</CardDescription></CardHeader><CardContent className="space-y-3"><Textarea placeholder={`Hi {{name}}, your tracking link is: {{tracking_link}}\n\nThank you for your order #{{order_id}}!`} value={customState.message} onChange={e => setCustomState(prev => ({ ...prev, message: e.target.value }))} rows={5} /><Separator /><div className="space-y-2"><Label>Media URL (Optional)</Label><Input type="url" placeholder="https://example.com/image.jpg" value={customState.mediaUrl} onChange={e => setCustomState(prev => ({ ...prev, mediaUrl: e.target.value }))} />{customState.mediaUrl && <Select value={customState.mediaType} onValueChange={(v: 'image' | 'video' | 'document') => setCustomState(prev => ({ ...prev, mediaType: v }))}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="image">Image</SelectItem><SelectItem value="video">Video</SelectItem><SelectItem value="document">Document</SelectItem></SelectContent></Select>}</div></CardContent></Card>
          </div>
          <div className="space-y-4">
            <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Eye className="h-5 w-5" />3. Preview</CardTitle><CardDescription>{customState.contacts.length > 0 ? `Previewing for: ${customState.contacts[0].name || customState.contacts[0].phone}` : 'Upload CSV to see preview with actual data'}</CardDescription></CardHeader><CardContent><div className="bg-[#075e54] rounded-lg p-4 min-h-[140px]"><div className="bg-[#dcf8c6] rounded-lg p-3 max-w-[85%] ml-auto shadow"><p className="text-sm text-gray-800 whitespace-pre-wrap">{previewMessage}</p><p className="text-[10px] text-gray-500 text-right mt-1">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div></div></CardContent></Card>
            <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><TrendingUp className="h-5 w-5" />4. Settings & Send</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Interval (seconds)</Label><Select value={String(customState.intervalMs)} onValueChange={v => setCustomState(prev => ({ ...prev, intervalMs: Number(v) }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1000">1 sec (Fast)</SelectItem><SelectItem value="2000">2 sec (Normal)</SelectItem><SelectItem value="3000">3 sec (Safe)</SelectItem><SelectItem value="5000">5 sec (Very Safe)</SelectItem><SelectItem value="10000">10 sec (Slow)</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Retries</Label><Select value={String(customState.retries)} onValueChange={v => setCustomState(prev => ({ ...prev, retries: Number(v) }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">1 attempt</SelectItem><SelectItem value="2">2 attempts</SelectItem><SelectItem value="3">3 attempts</SelectItem></SelectContent></Select></div></div><Separator /><div className="flex flex-wrap gap-2">{customState.status === 'idle' && <Button onClick={startCustomCampaign} disabled={customState.contacts.length === 0 || !customState.message || !evolutionConfig.connected} className="flex-1"><Play className="h-4 w-4 mr-2" />Start Campaign</Button>}{customState.status === 'running' && <Button onClick={pauseCustomCampaign} variant="secondary" className="flex-1"><Pause className="h-4 w-4 mr-2" />Pause</Button>}{customState.status === 'paused' && <Button onClick={resumeCustomCampaign} className="flex-1"><Play className="h-4 w-4 mr-2" />Resume</Button>}{(customState.status === 'running' || customState.status === 'paused') && <Button onClick={stopCustomCampaign} variant="destructive"><XCircle className="h-4 w-4 mr-2" />Stop</Button>}{(customState.status === 'completed' || customState.status === 'stopped') && <><Button onClick={resetCustomCampaign} variant="outline" className="flex-1"><RotateCcw className="h-4 w-4 mr-2" />Reset</Button><Button onClick={exportResults} variant="secondary"><Download className="h-4 w-4 mr-2" />Export Results</Button></>}</div>{customState.contacts.length > 0 && customState.status === 'idle' && <div className="p-3 bg-muted rounded-lg text-sm"><p className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-yellow-500" />Estimated time: ~{Math.ceil((customState.contacts.length * customState.intervalMs) / 60000)} minutes</p></div>}{!evolutionConfig.connected && customState.status === 'idle' && <div className="p-3 bg-destructive/10 rounded-lg text-sm text-destructive"><p className="flex items-center gap-2"><AlertCircle className="h-4 w-4" />Please connect WhatsApp before starting the campaign</p></div>}</CardContent></Card>
          </div>
        </div>
        <Card><CardHeader><CardTitle className="flex items-center justify-between"><span className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" />Message Logs</span>{customState.logs.length > 0 && <Button variant="outline" size="sm" onClick={exportResults}><Download className="h-4 w-4 mr-1" />Export</Button>}</CardTitle></CardHeader><CardContent><ScrollArea className="h-[400px]"><Table><TableHeader><TableRow><TableHead className="w-12">#</TableHead><TableHead>Phone</TableHead><TableHead>Name</TableHead><TableHead>Status</TableHead><TableHead>Attempts</TableHead><TableHead>Time</TableHead><TableHead>Message</TableHead></TableRow></TableHeader><TableBody>{customState.logs.map((log, idx) => <TableRow key={idx} className={log.status === 'success' ? 'bg-green-500/5' : log.status === 'failed' ? 'bg-red-500/5' : log.status === 'sending' ? 'bg-blue-500/5' : ''}><TableCell className="font-mono text-xs">{idx + 1}</TableCell><TableCell className="font-mono text-sm">{log.phone}</TableCell><TableCell>{log.name || '-'}</TableCell><TableCell><Badge variant={log.status === 'success' ? 'default' : log.status === 'failed' ? 'destructive' : log.status === 'sending' ? 'secondary' : 'outline'} className={log.status === 'success' ? 'bg-green-600' : ''}>{log.status === 'sending' && <Send className="h-3 w-3 mr-1 animate-pulse" />}{log.status === 'success' && <CheckCircle className="h-3 w-3 mr-1" />}{log.status === 'failed' && <XCircle className="h-3 w-3 mr-1" />}{log.status}</Badge></TableCell><TableCell>{log.attempt || '-'}</TableCell><TableCell className="text-xs text-muted-foreground">{log.sentAt || '-'}</TableCell><TableCell className="text-xs max-w-[200px] truncate">{log.message}</TableCell></TableRow>)}{customState.logs.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Upload a CSV to see contacts here</TableCell></TableRow>}</TableBody></Table></ScrollArea></CardContent></Card>
      </div>
    </AdminLayout>
  );
};

export default CampaignsPage;