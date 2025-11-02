import React, { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Search, X } from "lucide-react";

// --- Plugins infra (from PluginsManager) ---
import { pluginRegistry } from "@/plugins/registry";
import { usePlugins } from "@/plugins/Provider";
import { savePluginConfig, togglePlugin } from "@/plugins/service";
import type {
  PluginKey,
  WhatsAppPluginConfig,
  VideoPluginConfig,
  PopupBannerConfig,
  GoogleAnalyticsConfig,
  GoogleTagManagerConfig,
  FacebookPixelConfig,
  MicrosoftClarityConfig,
  CustomScriptsConfig,
  CustomScript,
} from "@/plugins/types";

// --- Optional content pickers used inside PluginsManager (safe to keep no-ops if you don't use them) ---
import {
  getContentItems,
  uploadVideo,
  getContentVideoUrl,
  type ContentItem,
  getContentImageUrl,
  uploadImage,
} from "@/lib/content-service";
import { pocketbase } from "@/lib/pocketbase";
import { ProductImage } from "@/components/ProductImage";

/**
 * ZenthraPlugins: Admin page that renders the PluginsManager UI inside AdminLayout.
 * This merges the richer PluginsManager controls into the Zenthra page without duplicating logic.
 */
export default function ZenthraPlugins() {
  return (
    <AdminLayout>
      <div className="container mx-auto py-8">
        <MergedPluginsManager />
      </div>
    </AdminLayout>
  );
}

/** MergedPluginsManager – previously default export from PluginsManager.tsx **/
function MergedPluginsManager() {
  const { enabled, configs, loading, reload } = usePlugins();

  const [waConfig, setWaConfig] = useState<WhatsAppPluginConfig | null>(null);
  const [vidConfig, setVidConfig] = useState<VideoPluginConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [videoPickerOpen, setVideoPickerOpen] = useState(false);
  const [videos, setVideos] = useState<ContentItem[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [popupConfig, setPopupConfig] = useState<PopupBannerConfig | null>(null);
  const [gaConfig, setGaConfig] = useState<GoogleAnalyticsConfig | null>(null);
  const [gtmConfig, setGtmConfig] = useState<GoogleTagManagerConfig | null>(null);
  const [fbConfig, setFbConfig] = useState<FacebookPixelConfig | null>(null);
  const [clarityConfig, setClarityConfig] = useState<MicrosoftClarityConfig | null>(null);
  const [customScriptsConfig, setCustomScriptsConfig] = useState<CustomScriptsConfig | null>(null);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [images, setImages] = useState<ContentItem[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [selected, setSelected] = useState<PluginKey>("whatsapp_floating");
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductForVideo, setSelectedProductForVideo] = useState<{
    index: number;
    type: "main" | "path";
  } | null>(null);
  const [selectedVideoField, setSelectedVideoField] = useState<{
    type: "main" | "product" | "path";
    index?: number;
  } | null>(null);

  useEffect(() => {
    if (!loading) {
      setWaConfig(configs.whatsapp_floating as WhatsAppPluginConfig);
      setVidConfig(configs.video_floating as VideoPluginConfig);
      setPopupConfig(configs.popup_banner as PopupBannerConfig);
      setGaConfig(configs.google_analytics as GoogleAnalyticsConfig);
      setGtmConfig(configs.google_tag_manager as GoogleTagManagerConfig);
      setFbConfig(configs.facebook_pixel as FacebookPixelConfig);
      setClarityConfig(configs.microsoft_clarity as MicrosoftClarityConfig);
      setCustomScriptsConfig(configs.custom_scripts as CustomScriptsConfig);
    }
  }, [configs, loading]);

  const onToggle = async (key: PluginKey, value: boolean) => {
    await togglePlugin(key, value);
    await reload();
  };

  const onSave = async (key: PluginKey) => {
    try {
      setSaving(true);
      if (key === "whatsapp_floating" && waConfig) await savePluginConfig(key, waConfig);
      if (key === "video_floating" && vidConfig) await savePluginConfig(key, vidConfig);
      if (key === "popup_banner" && popupConfig) await savePluginConfig(key, popupConfig);
      if (key === "google_analytics" && gaConfig) await savePluginConfig(key, gaConfig);
      if (key === "google_tag_manager" && gtmConfig) await savePluginConfig(key, gtmConfig);
      if (key === "facebook_pixel" && fbConfig) await savePluginConfig(key, fbConfig);
      if (key === "microsoft_clarity" && clarityConfig) await savePluginConfig(key, clarityConfig);
      if (key === "custom_scripts" && customScriptsConfig) await savePluginConfig(key, customScriptsConfig);
      await reload();
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = (key: PluginKey) => {
    if (key === "whatsapp_floating") setWaConfig(pluginRegistry.whatsapp_floating.defaultConfig);
    if (key === "video_floating") setVidConfig(pluginRegistry.video_floating.defaultConfig);
    if (key === "popup_banner") setPopupConfig(pluginRegistry.popup_banner.defaultConfig);
    if (key === "google_analytics") setGaConfig(pluginRegistry.google_analytics.defaultConfig);
    if (key === "google_tag_manager") setGtmConfig(pluginRegistry.google_tag_manager.defaultConfig);
    if (key === "facebook_pixel") setFbConfig(pluginRegistry.facebook_pixel.defaultConfig);
    if (key === "microsoft_clarity") setClarityConfig(pluginRegistry.microsoft_clarity.defaultConfig);
    if (key === "custom_scripts") setCustomScriptsConfig(pluginRegistry.custom_scripts.defaultConfig);
  };

  // --- Optional content loaders (used by pickers) ---
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
    if (!created) return;
    await loadVideos();
    const url = getContentVideoUrl(created);
    if (selectedVideoField?.type === "main") {
      if (vidConfig) setVidConfig({ ...vidConfig, videoUrl: url });
    } else if (selectedVideoField?.type === "product" && selectedVideoField.index !== undefined) {
      if (vidConfig) {
        const updated = [...(vidConfig.productVideos || [])];
        updated[selectedVideoField.index] = { ...updated[selectedVideoField.index], videoUrl: url };
        setVidConfig({ ...vidConfig, productVideos: updated });
      }
    } else if (selectedVideoField?.type === "path" && selectedVideoField.index !== undefined) {
      if (vidConfig) {
        const updated = [...(vidConfig.pathConfigs || [])];
        updated[selectedVideoField.index] = { ...updated[selectedVideoField.index], videoUrl: url };
        setVidConfig({ ...vidConfig, pathConfigs: updated });
      }
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
    if (!created) return;
    await loadImages();
    const url = getContentImageUrl(created);
    if (popupConfig) setPopupConfig({ ...popupConfig, imageUrl: url });
  };

  // --- Products for video linking (optional) ---
  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      // Wait a bit for PocketBase auth to be ready
      await new Promise((resolve) => setTimeout(resolve, 100));
      let records: any = { items: [] };
      try {
        records = await pocketbase.collection("products").getList(1, 50, { sort: "-created" });
      } catch {
        try {
          records = await pocketbase.collection("products").getList(1, 50);
        } catch {
          try {
            records = await pocketbase.collection("products").getList(1, 10);
          } catch {
            const fullList = await pocketbase.collection("products").getFullList();
            records = { items: fullList.slice(0, 50) };
          }
        }
      }
      setProducts(records.items || records || []);
    } catch (err) {
      console.error("Failed loading products", err);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    (p?.name || "").toLowerCase().includes(productSearch.toLowerCase())
  );

  const handleProductSelect = (product: any) => {
    if (!selectedProductForVideo || !vidConfig) return;
    const { index, type } = selectedProductForVideo;
    if (type === "main") {
      const updated = [...(vidConfig.productVideos || [])];
      updated[index] = { ...updated[index], productId: product.id };
      setVidConfig({ ...vidConfig, productVideos: updated });
    }
    setProductPickerOpen(false);
    setSelectedProductForVideo(null);
    setProductSearch("");
  };

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <aside className="w-64 shrink-0">
        <div className="rounded-md border bg-card">
          <div className="p-3 border-b text-sm font-medium">Plugins</div>
          <nav className="p-2 space-y-1">
            <button
              type="button"
              className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent ${
                selected === "whatsapp_floating" ? "bg-accent" : ""
              }`}
              onClick={() => setSelected("whatsapp_floating")}
              title="WhatsApp Floating settings"
            >
              <span>WhatsApp Floating</span>
              <Switch
                checked={enabled.whatsapp_floating}
                onCheckedChange={(v) => onToggle("whatsapp_floating", v)}
              />
            </button>
            <button
              type="button"
              className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent ${
                selected === "video_floating" ? "bg-accent" : ""
              }`}
              onClick={() => setSelected("video_floating")}
              title="Video Floating settings"
            >
              <span>Video Floating</span>
              <Switch
                checked={enabled.video_floating}
                onCheckedChange={(v) => onToggle("video_floating", v)}
              />
            </button>
            <button
              type="button"
              className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent ${
                selected === "popup_banner" ? "bg-accent" : ""
              }`}
              onClick={() => setSelected("popup_banner")}
              title="Popup Banner settings"
            >
              <span>Popup Banner</span>
              <Switch
                checked={enabled.popup_banner}
                onCheckedChange={(v) => onToggle("popup_banner", v)}
              />
            </button>

            {/* Analytics */}
            <div className="pt-2 mt-2 border-t">
              <div className="px-3 py-1 text-xs font-medium text-muted-foreground">
                Analytics
              </div>
            </div>
            <button
              type="button"
              className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent ${
                selected === "google_analytics" ? "bg-accent" : ""
              }`}
              onClick={() => setSelected("google_analytics")}
              title="Google Analytics (GA4) settings"
            >
              <span>Google Analytics</span>
              <Switch
                checked={enabled.google_analytics}
                onCheckedChange={(v) => onToggle("google_analytics", v)}
              />
            </button>
            <button
              type="button"
              className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent ${
                selected === "google_tag_manager" ? "bg-accent" : ""
              }`}
              onClick={() => setSelected("google_tag_manager")}
              title="Google Tag Manager settings"
            >
              <span>Google Tag Manager</span>
              <Switch
                checked={enabled.google_tag_manager}
                onCheckedChange={(v) => onToggle("google_tag_manager", v)}
              />
            </button>
            <button
              type="button"
              className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent ${
                selected === "facebook_pixel" ? "bg-accent" : ""
              }`}
              onClick={() => setSelected("facebook_pixel")}
              title="Facebook Pixel settings"
            >
              <span>Facebook Pixel</span>
              <Switch
                checked={enabled.facebook_pixel}
                onCheckedChange={(v) => onToggle("facebook_pixel", v)}
              />
            </button>
            <button
              type="button"
              className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent ${
                selected === "microsoft_clarity" ? "bg-accent" : ""
              }`}
              onClick={() => setSelected("microsoft_clarity")}
              title="Microsoft Clarity settings"
            >
              <span>Microsoft Clarity</span>
              <Switch
                checked={enabled.microsoft_clarity}
                onCheckedChange={(v) => onToggle("microsoft_clarity", v)}
              />
            </button>

            {/* Custom */}
            <div className="pt-2 mt-2 border-t">
              <div className="px-3 py-1 text-xs font-medium text-muted-foreground">
                Custom
              </div>
            </div>
            <button
              type="button"
              className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent ${
                selected === "custom_scripts" ? "bg-accent" : ""
              }`}
              onClick={() => setSelected("custom_scripts")}
              title="Custom Scripts settings"
            >
              <span>Custom Scripts</span>
              <Switch
                checked={enabled.custom_scripts}
                onCheckedChange={(v) => onToggle("custom_scripts", v)}
              />
            </button>
          </nav>
        </div>
      </aside>

      {/* Right panel */}
      <section className="flex-1 space-y-6">
        {selected === "whatsapp_floating" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>WhatsApp Floating Button</CardTitle>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Enabled</Label>
                <Switch
                  checked={enabled.whatsapp_floating}
                  onCheckedChange={(v) => onToggle("whatsapp_floating", v)}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {waConfig && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="wa-phone">Phone Number (without +)</Label>
                    <Input
                      id="wa-phone"
                      value={waConfig.phoneNumber}
                      onChange={(e) =>
                        setWaConfig({ ...waConfig, phoneNumber: e.target.value })
                      }
                      placeholder="919999999999"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="wa-msg">Default Message</Label>
                    <Input
                      id="wa-msg"
                      value={waConfig.message || ""}
                      onChange={(e) =>
                        setWaConfig({ ...waConfig, message: e.target.value })
                      }
                      placeholder="Hello! I need help."
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Button Color</Label>
                      <Input
                        value={waConfig.buttonColor || ""}
                        onChange={(e) =>
                          setWaConfig({ ...waConfig, buttonColor: e.target.value })
                        }
                        placeholder="#25D366"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Text Color</Label>
                      <Input
                        value={waConfig.textColor || ""}
                        onChange={(e) =>
                          setWaConfig({ ...waConfig, textColor: e.target.value })
                        }
                        placeholder="#ffffff"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => onSave("whatsapp_floating")}
                      disabled={saving}
                    >
                      {saving ? "Saving…" : "Save"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => resetToDefault("whatsapp_floating")}
                    >
                      Reset to default
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {selected === "video_floating" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Video Floating</CardTitle>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Enabled</Label>
                <Switch
                  checked={enabled.video_floating}
                  onCheckedChange={(v) => onToggle("video_floating", v)}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {vidConfig && (
                <>
                  <div className="grid gap-2">
                    <Label>Video URL (YouTube embed or MP4)</Label>
                    <Input
                      value={vidConfig.videoUrl || ""}
                      onChange={(e) =>
                        setVidConfig({ ...vidConfig, videoUrl: e.target.value })
                      }
                      placeholder="https://www.youtube.com/embed/... or https://.../video.mp4"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => onSave("video_floating")}
                      disabled={saving}
                    >
                      {saving ? "Saving…" : "Save"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => resetToDefault("video_floating")}
                    >
                      Reset to default
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {selected === "popup_banner" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Popup Banner</CardTitle>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Enabled</Label>
                <Switch
                  checked={enabled.popup_banner}
                  onCheckedChange={(v) => onToggle("popup_banner", v)}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {popupConfig && (
                <>
                  <div className="grid gap-2">
                    <Label>Title</Label>
                    <Input
                      value={popupConfig.title || ""}
                      onChange={(e) =>
                        setPopupConfig({ ...popupConfig, title: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Subtitle</Label>
                    <Input
                      value={popupConfig.subtitle || ""}
                      onChange={(e) =>
                        setPopupConfig({ ...popupConfig, subtitle: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Image URL</Label>
                    <Input
                      value={popupConfig.imageUrl || ""}
                      onChange={(e) =>
                        setPopupConfig({ ...popupConfig, imageUrl: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => onSave("popup_banner")}
                      disabled={saving}
                    >
                      {saving ? "Saving…" : "Save"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => resetToDefault("popup_banner")}
                    >
                      Reset to default
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Shared analytics form */}
        {(["google_analytics", "google_tag_manager", "facebook_pixel", "microsoft_clarity"] as PluginKey[]).includes(
          selected
        ) && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                {selected === "google_analytics" && "Google Analytics"}
                {selected === "google_tag_manager" && "Google Tag Manager"}
                {selected === "facebook_pixel" && "Facebook Pixel"}
                {selected === "microsoft_clarity" && "Microsoft Clarity"}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Enabled</Label>
                <Switch
                  checked={enabled[selected]}
                  onCheckedChange={(v) => onToggle(selected, v)}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {selected === "google_analytics" && (
                <div className="grid gap-2">
                  <Label>Measurement ID (G-XXXXXXX)</Label>
                  <Input
                    value={gaConfig?.measurementId || ""}
                    onChange={(e) =>
                      setGaConfig({ ...(gaConfig || {}), measurementId: e.target.value })
                    }
                  />
                </div>
              )}
              {selected === "google_tag_manager" && (
                <div className="grid gap-2">
                  <Label>Container ID (GTM-XXXXXX)</Label>
                  <Input
                    value={gtmConfig?.containerId || ""}
                    onChange={(e) =>
                      setGtmConfig({ ...(gtmConfig || {}), containerId: e.target.value })
                    }
                  />
                </div>
              )}
              {selected === "facebook_pixel" && (
                <div className="grid gap-2">
                  <Label>Pixel ID</Label>
                  <Input
                    value={fbConfig?.pixelId || ""}
                    onChange={(e) =>
                      setFbConfig({ ...(fbConfig || {}), pixelId: e.target.value })
                    }
                  />
                </div>
              )}
              {selected === "microsoft_clarity" && (
                <div className="grid gap-2">
                  <Label>Project ID</Label>
                  <Input
                    value={clarityConfig?.projectId || ""}
                    onChange={(e) =>
                      setClarityConfig({ ...(clarityConfig || {}), projectId: e.target.value })
                    }
                  />
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={() => onSave(selected)} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
                <Button variant="outline" onClick={() => resetToDefault(selected)}>
                  Reset to default
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {selected === "custom_scripts" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Custom Scripts</CardTitle>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Enabled</Label>
                <Switch
                  checked={enabled.custom_scripts}
                  onCheckedChange={(v) => onToggle("custom_scripts", v)}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {customScriptsConfig && (
                <>
                  <div className="grid gap-2">
                    <Label>Scripts JSON (array)</Label>
                    <Textarea
                      className="h-40 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
                      value={JSON.stringify(customScriptsConfig.scripts || [], null, 2)}
                      onChange={(e) => {
                        try {
                          const next = JSON.parse(e.target.value) as CustomScript[];
                          setCustomScriptsConfig({ ...(customScriptsConfig || {}), scripts: next });
                        } catch {}
                      }}
                      rows={8}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => onSave("custom_scripts")} disabled={saving}>
                      {saving ? "Saving…" : "Save"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => resetToDefault("custom_scripts")}
                    >
                      Reset to default
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </section>

      {/* Lightweight pickers (optional, shown only if you wire buttons to open them) */}
      <Dialog open={videoPickerOpen} onOpenChange={setVideoPickerOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Select a video</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 mb-3">
            <Input type="file" accept="video/*" onChange={(e) => e.target.files && handleUploadVideo(e.target.files[0])} />
            <Button type="button" variant="outline" onClick={loadVideos} disabled={loadingVideos}>
              {loadingVideos ? "Loading…" : "Refresh"}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-auto">
            {videos.map((v) => (
              <div key={v.id} className="rounded border p-2">
                <div className="text-xs break-all">{getContentVideoUrl(v)}</div>
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    const url = getContentVideoUrl(v);
                    if (selectedVideoField?.type === "main") {
                      if (vidConfig) setVidConfig({ ...vidConfig, videoUrl: url });
                    }
                    setVideoPickerOpen(false);
                  }}
                >
                  Use this video
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={imagePickerOpen} onOpenChange={setImagePickerOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Select an image</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 mb-3">
            <Input type="file" accept="image/*" onChange={(e) => e.target.files && handleUploadImage(e.target.files[0])} />
            <Button type="button" variant="outline" onClick={loadImages} disabled={loadingImages}>
              {loadingImages ? "Loading…" : "Refresh"}
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-3 max-h-[60vh] overflow-auto">
            {images.map((img) => (
              <button
                key={img.id}
                className="rounded border p-2 text-left"
                onClick={() => {
                  const url = getContentImageUrl(img);
                  if (popupConfig) setPopupConfig({ ...popupConfig, imageUrl: url });
                  setImagePickerOpen(false);
                }}
              >
                <div className="aspect-video rounded bg-muted/40 mb-2 overflow-hidden">
                  <ProductImage src={getContentImageUrl(img)} alt={img.name} className="w-full h-full object-cover" />
                </div>
                <div className="text-xs break-all">{getContentImageUrl(img)}</div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Product picker (optional) */}
      <Dialog open={productPickerOpen} onOpenChange={setProductPickerOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Select a product</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search product by name"
                className="pl-8"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
              {productSearch && (
                <button
                  type="button"
                  className="absolute right-2 top-2.5"
                  onClick={() => setProductSearch("")}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button type="button" variant="outline" onClick={loadProducts} disabled={loadingProducts}>
              {loadingProducts ? "Loading…" : "Refresh"}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-auto">
            {filteredProducts.map((p) => (
              <button
                key={p.id}
                className="rounded border p-2 text-left"
                onClick={() => handleProductSelect(p)}
              >
                <div className="font-medium truncate" title={p.name}>{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.id}</div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
