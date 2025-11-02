import React, { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { pb } from '@/lib/pocketbase';

type ProductCardSettings = {
  corner?: 'square'|'rounded'|'pill';
  shadow?: 'none'|'soft'|'medium'|'strong';
  showWishlist?: boolean;
  showTags?: boolean;
  showDescription?: boolean;
  ctaLabel?: string;
  ctaStyle?: 'default'|'outline'|'pill';
  imageRatio?: 'portrait'|'square'|'wide';
  titleSize?: 'sm'|'md'|'lg';
  descSize?: 'sm'|'md'|'lg';
  ctaSize?: 'sm'|'md'|'lg';
  spacing?: 'compact'|'comfortable';
}

type ThemeSettings = {
  id: string;
  name: string;
  is_active: boolean;
  primary_color?: string;
  primary_color_hover?: string;
  primary_color_hsl?: string;
  accent_color?: string;
  accent_color_hsl?: string;
  text_on_primary?: string;
  dark_mode_primary_color_hsl?: string;
  dark_mode_accent_color_hsl?: string;
  data?: any;
}

const ZenthraThemes: React.FC = () => {
  const [themes, setThemes] = useState<ThemeSettings[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<ThemeSettings> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [radius, setRadius] = useState<string>(() => localStorage.getItem('theme_radius') || '1rem');
  const [pc, setPc] = useState<ProductCardSettings>({ corner: 'rounded', shadow: 'soft', showWishlist: true, showTags: true, showDescription: true, ctaLabel: 'Add to Cart', ctaStyle: 'pill' });

  const templates = [
    { name: 'Indigo', primaryHex: '#4f46e5', primaryHsl: '243 75% 58%', accentHex: '#a5b4fc', accentHsl: '237 91% 85%', textOnPrimary: '#ffffff', darkPrimaryHsl: '243 60% 46%', darkAccentHsl: '237 50% 40%' },
    { name: 'Teal', primaryHex: '#32a1a1', primaryHsl: '181 70% 44%', accentHex: '#7cc0c0', accentHsl: '181 40% 60%', textOnPrimary: '#ffffff', darkPrimaryHsl: '181 35% 35%', darkAccentHsl: '181 30% 28%' },
  ];

  const selected = useMemo(() => themes.find(t => t.id === selectedId) || null, [themes, selectedId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const list = await pb.collection('themes').getFullList<ThemeSettings>({ sort: '-updated' }) as any;
      setThemes(list);
      if (list.length) setSelectedId(list.find((t:any)=>t.is_active)?.id || list[0].id);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selected) return;
    const d = (selected as any).data as any | undefined;
    if (d) {
      setEditing({
        id: selected.id,
        name: selected.name,
        is_active: selected.is_active,
        primary_color: d.primary?.hex || selected.primary_color,
        primary_color_hover: d.primary?.hoverHex || selected.primary_color_hover,
        primary_color_hsl: d.primary?.hsl || selected.primary_color_hsl,
        accent_color: d.accent?.hex || selected.accent_color,
        accent_color_hsl: d.accent?.hsl || selected.accent_color_hsl,
        text_on_primary: d.textOnPrimary || selected.text_on_primary || '#ffffff',
        dark_mode_primary_color_hsl: d.dark?.primaryHsl || selected.dark_mode_primary_color_hsl,
        dark_mode_accent_color_hsl: d.dark?.accentHsl || selected.dark_mode_accent_color_hsl,
      });
      if (d.radiusRem) setRadius(d.radiusRem);
      if (d.productCard) setPc({ ...pc, ...d.productCard });
    } else {
      setEditing({ ...selected });
    }
  }, [selectedId]);

  const hexToHslString = (hex: string) => {
    try {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    } catch { return '0 0% 0%'; }
  };

  const hslStringToHex = (hsl: string) => {
    try {
      const [hStr, sStr, lStr] = hsl.trim().split(/\s+/);
      const h = Math.max(0, Math.min(360, parseFloat(hStr)));
      const s = Math.max(0, Math.min(100, parseFloat(sStr)))/100;
      const l = Math.max(0, Math.min(100, parseFloat(lStr)))/100;
      const c = (1 - Math.abs(2*l - 1)) * s;
      const x = c * (1 - Math.abs(((h/60) % 2) - 1));
      const m = l - c/2; let r=0,g=0,b=0;
      if (0<=h && h<60){r=c;g=x;b=0;} else if (60<=h && h<120){r=x;g=c;b=0;} else if (120<=h && h<180){r=0;g=c;b=x;} else if (180<=h && h<240){r=0;g=x;b=c;} else if (240<=h && h<300){r=x;g=0;b=c;} else {r=c;g=0;b=x;}
      const toHex=(v:number)=>{const n=Math.round((v+m)*255);return (n<16?'0':'')+n.toString(16)};
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    } catch { return '#000000'; }
  };

  const createNewTheme = async () => {
    setSaving(true);
    try {
      const t = await pb.collection('themes').create({
        name: 'New Theme',
        is_active: false,
        data: {
          primary: { hex: '#4f46e5', hsl: '243 75% 58%', hoverHex: '#4338ca' },
          accent: { hex: '#a5b4fc', hsl: '237 91% 85%' },
          textOnPrimary: '#ffffff',
          dark: { primaryHsl: '243 60% 46%', accentHsl: '237 50% 40%' },
          radiusRem: radius,
          productCard: pc,
        }
      });
      const list = await pb.collection('themes').getFullList<ThemeSettings>({ sort: '-updated' }) as any;
      setThemes(list); setSelectedId((t as any).id);
    } finally { setSaving(false); }
  };

  const save = async () => {
    if (!selected || !editing) return;
    setSaving(true);
    try {
      const updated = await pb.collection('themes').update(selected.id, {
        name: editing.name || selected.name,
        is_active: Boolean(editing.is_active),
        data: {
          primary: { hex: editing.primary_color || selected.primary_color, hsl: editing.primary_color_hsl || selected.primary_color_hsl, hoverHex: editing.primary_color_hover || selected.primary_color_hover },
          accent: { hex: editing.accent_color || selected.accent_color, hsl: editing.accent_color_hsl || selected.accent_color_hsl },
          textOnPrimary: editing.text_on_primary || selected.text_on_primary || '#ffffff',
          dark: { primaryHsl: editing.dark_mode_primary_color_hsl || selected.dark_mode_primary_color_hsl, accentHsl: editing.dark_mode_accent_color_hsl || selected.dark_mode_accent_color_hsl },
          radiusRem: radius,
          productCard: pc,
        }
      });
      setThemes(prev => prev.map(t => t.id === updated.id ? updated as any : t));
    } finally { setSaving(false); }
  };

  const activate = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await pb.collection('themes').update(selected.id, { is_active: true });
      const list = await pb.collection('themes').getFullList<ThemeSettings>();
      setThemes(list as any); setSelectedId(selected.id);
    } finally { setSaving(false); }
  };

  const onDelete = async () => {
    if (!selected) return; if (!confirm('Delete this theme?')) return;
    setSaving(true);
    try {
      await pb.collection('themes').delete(selected.id);
      const list = await pb.collection('themes').getFullList<ThemeSettings>();
      setThemes(list as any); setSelectedId(list[0]?.id || null);
    } finally { setSaving(false); }
  };

  const liveApplyRadius = (value: string) => {
    setRadius(value);
    localStorage.setItem('theme_radius', value);
    document.documentElement.style.setProperty('--radius', value);
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Theme Manager</h1>
            <p className="text-muted-foreground mt-1">Create, edit, and activate site themes.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={createNewTheme} disabled={saving}>New Theme</Button>
          </div>
        </div>

        <div className="flex gap-6">
          <aside className="w-64 shrink-0">
            <Card>
              <CardHeader><CardTitle className="text-base">Themes</CardTitle></CardHeader>
              <CardContent className="p-0">
                <nav className="p-2 space-y-1">
                  {themes.map(t => (
                    <button key={t.id} className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent ${selectedId===t.id?'bg-accent':''}`} onClick={()=>setSelectedId(t.id)}>
                      <span className="truncate">{t.name}</span>
                      {t.is_active ? <span className="text-xs px-2 py-0.5 rounded bg-primary text-primary-foreground">Active</span> : null}
                    </button>
                  ))}
                  {themes.length===0 && <div className="px-3 py-2 text-sm text-muted-foreground">No themes yet</div>}
                </nav>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader><CardTitle className="text-base">Premade Templates</CardTitle></CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {templates.map(tpl => (
                    <button key={tpl.name} onClick={()=> editing && setEditing({ ...editing, primary_color: tpl.primaryHex, primary_color_hsl: tpl.primaryHsl, accent_color: tpl.accentHex, accent_color_hsl: tpl.accentHsl, text_on_primary: tpl.textOnPrimary, dark_mode_primary_color_hsl: tpl.darkPrimaryHsl, dark_mode_accent_color_hsl: tpl.darkAccentHsl })} className="flex items-center gap-3 rounded-md border p-2 hover:ring-2 hover:ring-primary text-left">
                      <span className="h-8 w-8 rounded" style={{ backgroundColor: tpl.primaryHex }} />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{tpl.name}</div>
                        <div className="text-xs text-muted-foreground">Primary {tpl.primaryHsl} • Accent {tpl.accentHsl}</div>
                      </div>
                      <span className="h-8 w-8 rounded" style={{ backgroundColor: tpl.accentHex }} />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader><CardTitle className="text-base">Corner Radius</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Button variant={radius==='0rem'?'default':'outline'} size="sm" onClick={()=>liveApplyRadius('0rem')}>Square</Button>
                  <Button variant={radius==='0.5rem'?'default':'outline'} size="sm" onClick={()=>liveApplyRadius('0.5rem')}>Rounded</Button>
                  <Button variant={radius==='1rem'?'default':'outline'} size="sm" onClick={()=>liveApplyRadius('1rem')}>Curvy</Button>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="radius">Custom (rem)</Label>
                  <Input id="radius" value={radius} onChange={(e)=>liveApplyRadius(e.target.value)} placeholder="1rem" />
                  <p className="text-xs text-muted-foreground">Controls Tailwind radius tokens via --radius.</p>
                </div>
              </CardContent>
            </Card>
          </aside>

          <section className="flex-1 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Theme Settings</CardTitle><div className="flex items-center gap-2"><Label className="text-sm">Active</Label><Switch checked={Boolean(selected?.is_active)} onCheckedChange={()=>activate()} disabled={!selected||saving} /></div></CardHeader>
              <CardContent className="space-y-4">
                {editing ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="grid gap-2"><Label>Name</Label><Input value={editing.name || ''} onChange={(e)=>setEditing({ ...editing, name: e.target.value })} /></div>
                        <div className="grid gap-2"><Label>Text on Primary</Label><input type="color" className="h-10 w-16 rounded-md border border-input bg-background" value={(editing.text_on_primary as string)||'#ffffff'} onChange={(e)=>setEditing({ ...editing, text_on_primary: e.target.value })} /></div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="grid gap-2"><Label>Primary (color)</Label><input type="color" className="h-10 w-16 rounded-md border border-input bg-background" value={editing.primary_color || '#4f46e5'} onChange={(e)=>{ const hex=e.target.value; setEditing({ ...editing, primary_color: hex, primary_color_hsl: hexToHslString(hex) }); }} /></div>
                        <div className="grid gap-2"><Label>Accent (color)</Label><input type="color" className="h-10 w-16 rounded-md border border-input bg-background" value={editing.accent_color || '#a5b4fc'} onChange={(e)=>{ const hex=e.target.value; setEditing({ ...editing, accent_color: hex, accent_color_hsl: hexToHslString(hex) }); }} /></div>
                        <div className="grid gap-2"><Label>Primary Hover</Label><input type="color" className="h-10 w-16 rounded-md border border-input bg-background" value={editing.primary_color_hover || '#4338ca'} onChange={(e)=> setEditing({ ...editing, primary_color_hover: e.target.value })} /></div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="grid gap-2"><Label>Dark mode primary</Label><input type="color" className="h-10 w-16 rounded-md border border-input bg-background" value={hslStringToHex(editing.dark_mode_primary_color_hsl || '243 60% 46%')} onChange={(e)=> setEditing({ ...editing, dark_mode_primary_color_hsl: hexToHslString(e.target.value) })} /></div>
                        <div className="grid gap-2"><Label>Dark mode accent</Label><input type="color" className="h-10 w-16 rounded-md border border-input bg-background" value={hslStringToHex(editing.dark_mode_accent_color_hsl || '237 50% 40%')} onChange={(e)=> setEditing({ ...editing, dark_mode_accent_color_hsl: hexToHslString(e.target.value) })} /></div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="rounded-md border p-4"><div className="flex items-center justify-between mb-3"><span className="text-sm text-muted-foreground">Preview</span></div><div className="space-y-3"><button className="h-10 px-4 rounded-md bg-primary text-primary-foreground">Primary Button</button><div className="h-10 w-full rounded-md bg-accent" /></div></div>
                      <div className="flex gap-2 justify-end"><Button onClick={save} disabled={saving}>{saving?'Saving...':'Save'}</Button><Button variant="secondary" onClick={activate} disabled={!selected||saving}>Activate</Button><Button variant="outline" className="text-red-600" onClick={onDelete} disabled={!selected||saving}>Delete</Button></div>
                    </div>
                  </div>
                ) : (!loading && <div className="text-sm text-muted-foreground">Select or create a theme to begin.</div>)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Product Card</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="grid gap-2"><Label>Corners</Label><div className="flex gap-2"><Button variant={pc.corner==='square'?'default':'outline'} size="sm" onClick={()=>setPc({ ...pc, corner:'square' })}>Square</Button><Button variant={pc.corner==='rounded'?'default':'outline'} size="sm" onClick={()=>setPc({ ...pc, corner:'rounded' })}>Rounded</Button><Button variant={pc.corner==='pill'?'default':'outline'} size="sm" onClick={()=>setPc({ ...pc, corner:'pill' })}>Pill</Button></div></div>
                  <div className="grid gap-2"><Label htmlFor="pc-shadow">Shadow</Label><select id="pc-shadow" className="h-10 rounded-md border border-input bg-background px-2" value={pc.shadow} onChange={(e)=>setPc({ ...pc, shadow: e.target.value as any })}><option value="none">None</option><option value="soft">Soft</option><option value="medium">Medium</option><option value="strong">Strong</option></select></div>
                  <div className="grid gap-2"><Label htmlFor="pc-cta">CTA Label</Label><Input id="pc-cta" value={pc.ctaLabel||''} onChange={(e)=>setPc({ ...pc, ctaLabel: e.target.value })} placeholder="Add to Cart" /></div>
                </div>
                <div className="grid md:grid-cols-3 gap-4 items-center">
                  <div className="flex items-center justify-between border rounded-md p-3"><div className="space-y-1"><Label className="text-sm">Show Wishlist</Label><p className="text-xs text-muted-foreground">Heart icon on the card</p></div><Switch checked={pc.showWishlist!==false} onCheckedChange={(v)=>setPc({ ...pc, showWishlist: v })} /></div>
                  <div className="flex items-center justify-between border rounded-md p-3"><div className="space-y-1"><Label className="text-sm">Show Tags</Label><p className="text-xs text-muted-foreground">Small chips under image</p></div><Switch checked={pc.showTags!==false} onCheckedChange={(v)=>setPc({ ...pc, showTags: v })} /></div>
                  <div className="flex items-center justify-between border rounded-md p-3"><div className="space-y-1"><Label className="text-sm">Show Description</Label><p className="text-xs text-muted-foreground">Short text under title</p></div><Switch checked={pc.showDescription!==false} onCheckedChange={(v)=>setPc({ ...pc, showDescription: v })} /></div>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="grid gap-2"><Label>CTA Style</Label><div className="flex gap-2"><Button variant={pc.ctaStyle==='default'?'default':'outline'} size="sm" onClick={()=>setPc({ ...pc, ctaStyle:'default' })}>Default</Button><Button variant={pc.ctaStyle==='outline'?'default':'outline'} size="sm" onClick={()=>setPc({ ...pc, ctaStyle:'outline' })}>Outline</Button><Button variant={pc.ctaStyle==='pill'?'default':'outline'} size="sm" onClick={()=>setPc({ ...pc, ctaStyle:'pill' })}>Pill</Button></div></div>
                  <div className="grid gap-2"><Label htmlFor="pc-image">Image Ratio</Label><select id="pc-image" className="h-10 rounded-md border border-input bg-background px-2" value={pc.imageRatio} onChange={(e)=>setPc({ ...pc, imageRatio: e.target.value as any })}><option value="portrait">Portrait</option><option value="square">Square</option><option value="wide">Wide</option></select></div>
                  <div className="grid gap-2"><Label htmlFor="pc-spacing">Spacing</Label><select id="pc-spacing" className="h-10 rounded-md border border-input bg-background px-2" value={pc.spacing} onChange={(e)=>setPc({ ...pc, spacing: e.target.value as any })}><option value="compact">Compact</option><option value="comfortable">Comfortable</option></select></div>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="grid gap-2"><Label htmlFor="pc-title">Title Size</Label><select id="pc-title" className="h-10 rounded-md border border-input bg-background px-2" value={pc.titleSize} onChange={(e)=>setPc({ ...pc, titleSize: e.target.value as any })}><option value="sm">Small</option><option value="md">Medium</option><option value="lg">Large</option></select></div>
                  <div className="grid gap-2"><Label htmlFor="pc-desc">Description Size</Label><select id="pc-desc" className="h-10 rounded-md border border-input bg-background px-2" value={pc.descSize} onChange={(e)=>setPc({ ...pc, descSize: e.target.value as any })}><option value="sm">Small</option><option value="md">Medium</option><option value="lg">Large</option></select></div>
                  <div className="grid gap-2"><Label htmlFor="pc-ctasize">CTA Size</Label><select id="pc-ctasize" className="h-10 rounded-md border border-input bg-background px-2" value={pc.ctaSize} onChange={(e)=>setPc({ ...pc, ctaSize: e.target.value as any })}><option value="sm">Small</option><option value="md">Medium</option><option value="lg">Large</option></select></div>
                </div>
                <div className="mt-2">
                  <Label className="text-sm mb-2 block">Preview</Label>
                  <div className="max-w-xs">
                    <div className={`bg-card ${pc.corner==='pill'?'rounded-3xl':pc.corner==='square'?'rounded-md':'rounded-xl'} overflow-hidden ${pc.shadow==='none'?'':pc.shadow==='soft'?'shadow-sm':pc.shadow==='medium'?'shadow-md':'shadow-lg'}`}>
                      <div className={`${pc.imageRatio==='square'?'aspect-square':pc.imageRatio==='wide'?'aspect-[4/3]':'aspect-[3/4]'} bg-muted relative`}>
                        <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-background/90 text-foreground text-sm font-semibold shadow-sm">₹999.00</div>
                      </div>
                      <div className={`${pc.spacing==='comfortable'?'p-4':'p-3'}`}>
                        <div className={`${pc.titleSize==='lg'?'text-lg':pc.titleSize==='sm'?'text-sm':'text-base'} font-semibold mb-1`}>Sample Product</div>
                        {pc.showDescription && (<div className={`${pc.descSize==='lg'?'text-base':pc.descSize==='sm'?'text-xs':'text-sm'} text-muted-foreground line-clamp-2 mb-2`}>Short product description to preview spacing and size.</div>)}
                        <div className="flex items-center justify-between gap-3">
                          <div className="hidden sm:flex items-center border rounded-md overflow-hidden bg-background">
                            <button className="h-8 w-8" aria-label="decrease" />
                            <span className="w-8 text-center text-sm font-medium">1</span>
                            <button className="h-8 w-8" aria-label="increase" />
                          </div>
                          <button className={`px-4 ${pc.ctaSize==='lg'?'h-11':pc.ctaSize==='sm'?'h-9':'h-10'} ${pc.ctaStyle==='pill'?'rounded-full':'rounded-md'} bg-primary text-primary-foreground`}>{pc.ctaLabel}</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end"><Button onClick={save} disabled={saving}>{saving?'Saving…':'Save Card Settings'}</Button></div>
                <div className="text-xs text-muted-foreground">These settings affect product cards on Shop and related sections.</div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ZenthraThemes;
