import React, { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { listNavbarConfigs, createNavbarConfig, updateNavbarConfig, deleteNavbarConfig, activateNavbarConfig, listPagesLite, type NavbarConfigRecord, type PageLite } from '@/lib/pocketbase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const NavbarSettingsPage: React.FC = () => {
  const [configs, setConfigs] = useState<NavbarConfigRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const selected = useMemo(() => configs.find(i => i.id === selectedId) || null, [configs, selectedId]);
  const [editing, setEditing] = useState<Partial<NavbarConfigRecord> | null>(null);

  type NavItem = { id: string; label: string; pagePath?: string; url?: string; openInNewTab?: boolean; children?: NavItem[]; mega?: boolean; columns?: number; imageUrl?: string };
  const menuItems: NavItem[] = useMemo(() => (editing?.items as unknown as NavItem[]) || [], [editing]);

  const setMenuItems = (next: NavItem[]) => setEditing((e) => ({ ...(e || {}), items: next }) as any);

  const newId = () => Math.random().toString(36).slice(2, 8);
  const addTopItem = () => setMenuItems([...(menuItems || []), { id: newId(), label: 'Menu', pagePath: '/', children: [] }]);
  const removeTopItem = (idx: number) => setMenuItems((menuItems || []).filter((_, i) => i !== idx));
  const moveItem = (idx: number, dir: -1 | 1) => {
    const arr = [...(menuItems || [])];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    setMenuItems(arr);
  };
  const updateTopItem = (idx: number, patch: Partial<NavItem>) => {
    const arr = [...(menuItems || [])];
    arr[idx] = { ...arr[idx], ...patch };
    setMenuItems(arr);
  };
  const addChild = (idx: number) => {
    const arr = [...(menuItems || [])];
    const ch = [...(arr[idx].children || [])];
    ch.push({ id: newId(), label: 'Submenu', pagePath: '/' });
    arr[idx].children = ch;
    setMenuItems(arr);
  };
  const updateChild = (pi: number, ci: number, patch: Partial<NavItem>) => {
    const arr = [...(menuItems || [])];
    const ch = [...(arr[pi].children || [])];
    ch[ci] = { ...ch[ci], ...patch };
    arr[pi].children = ch;
    setMenuItems(arr);
  };
  const removeChild = (pi: number, ci: number) => {
    const arr = [...(menuItems || [])];
    const ch = [...(arr[pi].children || [])].filter((_, i) => i !== ci);
    arr[pi].children = ch;
    setMenuItems(arr);
  };
  const moveChild = (pi: number, ci: number, dir: -1 | 1) => {
    const arr = [...(menuItems || [])];
    const ch = [...(arr[pi].children || [])];
    const j = ci + dir;
    if (j < 0 || j >= ch.length) return;
    [ch[ci], ch[j]] = [ch[j], ch[ci]];
    arr[pi].children = ch;
    setMenuItems(arr);
  };

  // Page picker state
  const [pages, setPages] = useState<PageLite[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pageQuery, setPageQuery] = useState('');
  const [pickerTarget, setPickerTarget] = useState<{ top: number; child?: number } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const list = await listPagesLite();
        setPages(list);
      } catch {}
    })();
  }, []);

  const filteredPages = useMemo(() => {
    const q = pageQuery.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter(p => (String(p.title || '').toLowerCase().includes(q) || String(p.slug || '').toLowerCase().includes(q)));
  }, [pages, pageQuery]);

  const openPicker = (topIndex: number, childIndex?: number) => {
    setPickerTarget({ top: topIndex, child: childIndex });
    setPickerOpen(true);
  };

  const choosePage = (p: PageLite) => {
    const path = `/page/${p.slug}`;
    if (pickerTarget) {
      if (typeof pickerTarget.child === 'number') {
        updateChild(pickerTarget.top, pickerTarget.child, { pagePath: path });
      } else {
        updateTopItem(pickerTarget.top, { pagePath: path });
      }
    }
    setPickerOpen(false);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      const list = await listNavbarConfigs();
      setConfigs(list);
      const active = list.find(x => x.is_active);
      setSelectedId(active?.id || list[0]?.id || null);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selected) return;
    setEditing({ ...selected });
  }, [selected]);

  const onCreate = async () => {
    setSaving(true);
    try {
      const rec = await createNavbarConfig({
        name: 'New Navbar',
        is_active: false,
        show_shop: true,
        show_about: true,
        show_contact: true,
        show_gifting: true,
        show_blog: true,
        show_bestsellers: true,
        show_new_arrivals: true,
      });
      const list = await listNavbarConfigs();
      setConfigs(list);
      setSelectedId(rec.id);
    } finally {
      setSaving(false);
    }
  };

  const onSave = async () => {
    if (!editing || !selected) return;
    setSaving(true);
    try {
      const rec = await updateNavbarConfig(selected.id, {
        name: (editing.name as string) || (selected.name as string) || 'Navbar',
        is_active: Boolean(editing.is_active),
        show_shop: Boolean(editing.show_shop),
        show_about: Boolean(editing.show_about),
        show_contact: Boolean(editing.show_contact),
        show_gifting: Boolean(editing.show_gifting),
        show_blog: Boolean(editing.show_blog),
        show_bestsellers: Boolean(editing.show_bestsellers),
        show_new_arrivals: Boolean(editing.show_new_arrivals),
        items: (editing.items as any) || [],
      });
      setConfigs(prev => prev.map(i => i.id === rec.id ? rec : i));
      setEditing({ ...rec });
    } finally {
      setSaving(false);
    }
  };

  const onActivate = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const rec = await activateNavbarConfig(selected.id);
      const list = await listNavbarConfigs();
      setConfigs(list);
      setSelectedId(rec.id);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!selected) return;
    if (!confirm('Delete this navbar config?')) return;
    setSaving(true);
    try {
      await deleteNavbarConfig(selected.id);
      const list = await listNavbarConfigs();
      setConfigs(list);
      setSelectedId(list[0]?.id || null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Navbar</h1>
          <p className="text-muted-foreground">Configure which menu items appear in the storefront navigation.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <aside className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Configurations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {configs.map((it) => (
                    <button
                      key={it.id}
                      className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left ${selectedId === it.id ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => setSelectedId(it.id)}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{String(it.name || 'Navbar')}</div>
                        <div className="text-xs text-muted-foreground">{new Date(it.created || '').toLocaleString()}</div>
                      </div>
                      {it.is_active ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-primary text-primary-foreground">Active</span>
                      ) : null}
                    </button>
                  ))}
                  {configs.length === 0 && !loading && (
                    <div className="text-sm text-muted-foreground">No configurations yet</div>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button onClick={onCreate} disabled={saving}>New</Button>
                  <Button variant="secondary" onClick={onActivate} disabled={!selected || saving}>Activate</Button>
                </div>
              </CardContent>
            </Card>
          </aside>

          <section className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Menu Items</CardTitle>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Active</Label>
                  <Switch checked={Boolean(editing?.is_active)} onCheckedChange={(v) => setEditing({ ...(editing || {}), is_active: Boolean(v) })} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {editing && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="nv-name">Name</Label>
                      <Input id="nv-name" value={String(editing.name || '')} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Navbar name" />
                    </div>

                    <Separator />

                    <div className="grid sm:grid-cols-2 gap-3">
                      <label className="flex items-center justify-between rounded-md border p-3 text-sm">
                        <span>Shop</span>
                        <Switch checked={Boolean(editing.show_shop ?? true)} onCheckedChange={(v) => setEditing({ ...editing, show_shop: Boolean(v) })} />
                      </label>
                      <label className="flex items-center justify-between rounded-md border p-3 text-sm">
                        <span>Bestsellers</span>
                        <Switch checked={Boolean(editing.show_bestsellers ?? true)} onCheckedChange={(v) => setEditing({ ...editing, show_bestsellers: Boolean(v) })} />
                      </label>
                      <label className="flex items-center justify-between rounded-md border p-3 text-sm">
                        <span>New Arrivals</span>
                        <Switch checked={Boolean(editing.show_new_arrivals ?? true)} onCheckedChange={(v) => setEditing({ ...editing, show_new_arrivals: Boolean(v) })} />
                      </label>
                      <label className="flex items-center justify-between rounded-md border p-3 text-sm">
                        <span>About</span>
                        <Switch checked={Boolean(editing.show_about ?? true)} onCheckedChange={(v) => setEditing({ ...editing, show_about: Boolean(v) })} />
                      </label>
                      <label className="flex items-center justify-between rounded-md border p-3 text-sm">
                        <span>Gifting</span>
                        <Switch checked={Boolean(editing.show_gifting ?? true)} onCheckedChange={(v) => setEditing({ ...editing, show_gifting: Boolean(v) })} />
                      </label>
                      <label className="flex items-center justify-between rounded-md border p-3 text-sm">
                        <span>Contact</span>
                        <Switch checked={Boolean(editing.show_contact ?? true)} onCheckedChange={(v) => setEditing({ ...editing, show_contact: Boolean(v) })} />
                      </label>
                      <label className="flex items-center justify-between rounded-md border p-3 text-sm">
                        <span>Blog</span>
                        <Switch checked={Boolean(editing.show_blog ?? true)} onCheckedChange={(v) => setEditing({ ...editing, show_blog: Boolean(v) })} />
                      </label>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Custom Menu (with dropdowns)</Label>
                        <Button size="sm" onClick={addTopItem}>Add item</Button>
                      </div>
                      <div className="grid gap-3">
                        {(menuItems || []).map((it, idx) => (
                          <div key={it.id} className="rounded-md border p-3 space-y-3">
                            <div className="grid md:grid-cols-2 gap-3">
                              <div className="grid gap-1">
                                <Label>Label</Label>
                                <Input value={it.label} onChange={(e) => updateTopItem(idx, { label: e.target.value })} />
                              </div>
                              <div className="grid gap-1">
                                <Label>Internal Page Path</Label>
                                <div className="flex gap-2">
                                  <Input placeholder="/about or /page/slug" value={it.pagePath || ''} onChange={(e) => updateTopItem(idx, { pagePath: e.target.value })} />
                                  <Button variant="outline" size="sm" onClick={() => openPicker(idx)}>Select</Button>
                                </div>
                              </div>
                              <div className="grid gap-1">
                                <Label>External URL (optional)</Label>
                                <Input placeholder="https://example.com" value={it.url || ''} onChange={(e) => updateTopItem(idx, { url: e.target.value })} />
                              </div>
                              <label className="flex items-center justify-between rounded-md border p-2">
                                <span className="text-sm">Open in new tab</span>
                                <Switch checked={Boolean(it.openInNewTab)} onCheckedChange={(v) => updateTopItem(idx, { openInNewTab: Boolean(v) })} />
                              </label>
                              <label className="flex items-center justify-between rounded-md border p-2">
                                <span className="text-sm">Mega menu</span>
                                <Switch checked={Boolean(it.mega)} onCheckedChange={(v) => updateTopItem(idx, { mega: Boolean(v) })} />
                              </label>
                              {it.mega ? (
                                <>
                                  <div className="grid gap-1">
                                    <Label>Columns (1-4)</Label>
                                    <Input type="number" min={1} max={4} value={Number(it.columns || 3)} onChange={(e) => updateTopItem(idx, { columns: Math.max(1, Math.min(4, Number(e.target.value) || 3)) })} />
                                  </div>
                                  <div className="grid gap-1">
                                    <Label>Promo Image URL (optional)</Label>
                                    <Input placeholder="https://..." value={it.imageUrl || ''} onChange={(e) => updateTopItem(idx, { imageUrl: e.target.value })} />
                                  </div>
                                </>
                              ) : null}
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => moveItem(idx, -1)} disabled={idx === 0}>Up</Button>
                              <Button size="sm" variant="outline" onClick={() => moveItem(idx, 1)} disabled={idx === (menuItems.length - 1)}>Down</Button>
                              <Button size="sm" variant="secondary" onClick={() => addChild(idx)}>Add submenu</Button>
                              <Button size="sm" variant="outline" className="text-red-600" onClick={() => removeTopItem(idx)}>Delete</Button>
                            </div>
                            {(it.children || []).length > 0 && (
                              <div className="rounded-md border p-2">
                                <div className="text-xs text-muted-foreground mb-2">Submenu</div>
                                <div className="grid gap-2">
                                  {(it.children || []).map((ch, ci) => (
                                    <div key={ch.id} className="rounded-md border p-2">
                                      <div className="grid md:grid-cols-2 gap-2">
                                        <div className="grid gap-1">
                                          <Label>Label</Label>
                                          <Input value={ch.label} onChange={(e) => updateChild(idx, ci, { label: e.target.value })} />
                                        </div>
                                        <div className="grid gap-1">
                                          <Label>Internal Page Path</Label>
                                          <div className="flex gap-2">
                                            <Input placeholder="/about or /page/slug" value={ch.pagePath || ''} onChange={(e) => updateChild(idx, ci, { pagePath: e.target.value })} />
                                            <Button variant="outline" size="sm" onClick={() => openPicker(idx, ci)}>Select</Button>
                                          </div>
                                        </div>
                                        <div className="grid gap-1">
                                          <Label>External URL (optional)</Label>
                                          <Input placeholder="https://example.com" value={ch.url || ''} onChange={(e) => updateChild(idx, ci, { url: e.target.value })} />
                                        </div>
                                        <label className="flex items-center justify-between rounded-md border p-2">
                                          <span className="text-sm">Open in new tab</span>
                                          <Switch checked={Boolean(ch.openInNewTab)} onCheckedChange={(v) => updateChild(idx, ci, { openInNewTab: Boolean(v) })} />
                                        </label>
                                      </div>
                                      <div className="flex gap-2 mt-2">
                                        <Button size="sm" variant="outline" onClick={() => moveChild(idx, ci, -1)} disabled={ci === 0}>Up</Button>
                                        <Button size="sm" variant="outline" onClick={() => moveChild(idx, ci, 1)} disabled={ci === ((it.children || []).length - 1)}>Down</Button>
                                        <Button size="sm" variant="outline" className="text-red-600" onClick={() => removeChild(idx, ci)}>Delete</Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button onClick={onSave} disabled={saving}>Save</Button>
                      <Button variant="secondary" onClick={onActivate} disabled={!selected || saving}>Activate</Button>
                      <Button variant="outline" className="text-red-600" onClick={onDelete} disabled={!selected || saving}>Delete</Button>
                    </div>
                  </>
                )}
                {!editing && !loading && (
                  <div className="text-sm text-muted-foreground">Select or create a configuration to begin.</div>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
        <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Select a Page</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <Input placeholder="Search pages by title or slug" value={pageQuery} onChange={(e) => setPageQuery(e.target.value)} />
              <div className="max-h-80 overflow-y-auto rounded-md border">
                {filteredPages.length === 0 && (
                  <div className="p-4 text-sm text-muted-foreground">No pages found</div>
                )}
                {filteredPages.map((p) => (
                  <button key={p.id} className="w-full text-left px-3 py-2 hover:bg-accent grid gap-0.5" onClick={() => choosePage(p)}>
                    <div className="text-sm font-medium">{String(p.title || p.slug || 'Untitled')}</div>
                    <div className="text-xs text-muted-foreground">/page/{String(p.slug || '')}</div>
                  </button>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default NavbarSettingsPage;
