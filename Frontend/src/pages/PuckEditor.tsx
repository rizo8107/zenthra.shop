import { useState, useEffect } from "react";
import { Puck, useGetPuck } from "@measured/puck";
import "@measured/puck/puck.css";
import "@/styles/puck-block.css";
import "@/styles/puck-editor-overrides.css";
import { completePuckConfig as puckConfig } from "@/puck/config/complete";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { pocketbase, getProducts } from "@/lib/pocketbase";
import TemplateDialog from "@/components/TemplateDialog";
import { Layout, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PageData {
  content: any;
  root: any;
}

// Lightweight types for AI integration
interface AiBlock {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: Record<string, any>;
}

interface AiPageData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  root?: Record<string, any>;
  content: AiBlock[];
}

const SelectionBridge = ({
  onChange,
}: {
  onChange: (id: string | null) => void;
}) => {
  const getPuckState = useGetPuck();
  useEffect(() => {
    const state = getPuckState();
    onChange(state?.selectedItem?.props?.id ?? null);
  });
  return null;
};

// Helpers to improve snapshot quality/timing
function delay(ms: number) { return new Promise<void>(res => setTimeout(res, ms)); }

async function waitForFonts(doc?: Document, timeoutMs = 6000) {
  try {
    const d: any = doc || document;
    if (d.fonts && typeof d.fonts.ready?.then === 'function') {
      await Promise.race([d.fonts.ready, delay(timeoutMs)]);
    }
  } catch { /* ignore */ }
}

async function waitForImages(scope: Document | HTMLElement, timeoutMs = 6000) {
  const root: ParentNode = (scope as any).querySelectorAll ? (scope as any) : document;
  const imgs: HTMLImageElement[] = Array.from((root as any).querySelectorAll?.('img') || []);
  const pending: Promise<void>[] = [];
  for (const img of imgs) {
    if (img.complete && img.naturalWidth > 0) continue;
    pending.push(new Promise<void>((resolve) => {
      const done = () => { img.removeEventListener('load', done); img.removeEventListener('error', done); resolve(); };
      img.addEventListener('load', done);
      img.addEventListener('error', done);
    }));
  }
  if (pending.length) {
    await Promise.race([Promise.allSettled(pending).then(() => undefined), delay(timeoutMs)]);
  }
}

declare global { interface Window { html2canvas?: any } }

async function waitForIdle(target: HTMLElement, timeoutMs = 6000) {
  const start = Date.now();
  const hasLoaders = () => !!target.querySelector(
    '.animate-spin, [aria-busy="true"], .skeleton, .loading, [data-loading="true"], .spinner, .loader'
  );
  // Give a quick initial frame
  await delay(100);
  while (Date.now() - start < timeoutMs) {
    if (!hasLoaders()) return;
    await delay(150);
  }
}

async function captureEditorSnapshot(): Promise<string | null> {
  try {
    const html2canvas = await loadHtml2Canvas();
    // Try to locate the preview canvas inside the editor
    const candidates = [
      '[data-puck-preview]',
      '.puck-preview',
      '.puck-canvas',
      '.puck-editor-root main',
      '.puck-editor-root'
    ];
    const found: HTMLElement[] = [];
    for (const sel of candidates) {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (el) found.push(el);
    }
    const target = found
      .map((el) => ({ el, rect: el.getBoundingClientRect() }))
      .filter(({ rect }) => rect.width > 100 && rect.height > 100)
      .sort((a, b) => b.rect.width * b.rect.height - a.rect.width * a.rect.height)[0]?.el;
    if (!target) return null;

    // Give the preview a moment to settle & load assets
    await waitForIdle(target);
    await waitForFonts();
    await waitForImages(target);
    await delay(800);

    const srcCanvas: HTMLCanvasElement = await html2canvas(target, {
      useCORS: true,
      backgroundColor: '#ffffff',
      scale: 1,
    });

    // Resize/crop to 800x450 with cover behavior
    const W = 800, H = 450;
    const out = document.createElement('canvas');
    out.width = W; out.height = H;
    const ctx = out.getContext('2d');
    if (!ctx) return srcCanvas.toDataURL('image/webp', 0.85);
    const sw = srcCanvas.width, sh = srcCanvas.height;
    const scale = Math.max(W / sw, H / sh);
    const dw = sw * scale, dh = sh * scale;
    const dx = (W - dw) / 2, dy = (H - dh) / 2;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(srcCanvas, dx, dy, dw, dh);
    return out.toDataURL('image/webp', 0.85);
  } catch (e) {
    console.warn('Editor snapshot failed', e);
    return null;
  }
}

async function loadHtml2Canvas(): Promise<any> {
  if (window.html2canvas) return window.html2canvas;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load html2canvas'));
    document.head.appendChild(s);
  });
  return window.html2canvas;
}

async function capturePageSnapshot(url: string): Promise<string | null> {
  try {
    const html2canvas = await loadHtml2Canvas();
    const iframe = document.createElement('iframe');
    Object.assign(iframe.style, {
      position: 'fixed',
      left: '-99999px',
      top: '0',
      width: '1200px',
      height: '675px',
      visibility: 'hidden',
    } as CSSStyleDeclaration);
    iframe.src = url;
    document.body.appendChild(iframe);
    await new Promise<void>((resolve, reject) => {
      iframe.onload = () => resolve();
      iframe.onerror = () => reject(new Error('iframe load error'));
      // safety timeout
      setTimeout(resolve, 8000);
    });
    const doc = iframe.contentDocument as Document | null;
    if (!doc) { document.body.removeChild(iframe); return null; }
    // wait for fonts and images inside iframe
    await waitForFonts(doc);
    await waitForImages(doc);
    await delay(400);
    const body = doc.body;
    (body as any).style.background = '#fff';
    const canvas = await html2canvas(body, {
      useCORS: true,
      backgroundColor: '#ffffff',
      windowWidth: 1200,
      windowHeight: 675,
      width: 800,
      height: 450,
      scale: 1,
    });
    const dataUrl = canvas.toDataURL('image/webp', 0.85);
    document.body.removeChild(iframe);
    return dataUrl as string;
  } catch (e) {
    console.warn('Snapshot failed', e);
    return null;
  }
}

export default function PuckEditor() {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<PageData>({ content: [], root: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageMeta, setPageMeta] = useState<{ slug?: string; published?: boolean }>({});
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [puckKey, setPuckKey] = useState(0);
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [aiMode, setAiMode] = useState<"page" | "section">("section");
  const [aiDescription, setAiDescription] = useState("");
  const [aiTone, setAiTone] = useState<"playful" | "professional" | "minimal" | "luxury" | "casual">("playful");
  const [aiUseProduct, setAiUseProduct] = useState(false);
  const [aiProductId, setAiProductId] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [productOptions, setProductOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [productSearch, setProductSearch] = useState("");
  const [currentSelectionId, setCurrentSelectionId] = useState<string | null>(null);

  // --- AI helper functions ---
  const ensureProductOptions = async () => {
    if (productOptions.length > 0) return;
    try {
      const records = await getProducts();
      const mapped = records
        .slice(0, 50)
        .map((p: any) => ({
          id: p.id || p.$id,
          name: p.name || p.title || p.id || p.$id,
        }))
        .filter((p) => p.id);
      setProductOptions(mapped);
    } catch (error) {
      console.error("[PuckEditor] Failed to load products for AI selector", error);
    }
  };

  const filteredProductOptions = productOptions.filter((p: { id: string; name: string }) => {
    if (!productSearch.trim()) return true;
    const q = productSearch.toLowerCase();
    return (p.name || "").toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
  });

  const handleOpenAiDialog = async () => {
    setShowAiDialog(true);
    if (aiUseProduct) {
      await ensureProductOptions();
    }
  };

  const handleGenerateWithAi = async () => {
    if (!aiDescription.trim()) {
      alert("Please describe what you want AI to generate.");
      return;
    }

    try {
      setAiLoading(true);

      const existingTypes = Array.isArray(data.content)
        ? Array.from(
            new Set(
              data.content
                .map((item: any) => item?.type)
                .filter((type): type is string => typeof type === "string" && type.length > 0),
            ),
          )
        : [];

      const payload: {
        mode: "page" | "section";
        description: string;
        tone: typeof aiTone;
        existingTypes: string[];
        productId?: string;
      } = {
        mode: aiMode,
        description: aiDescription.trim(),
        tone: aiTone,
        existingTypes,
      };

      if (aiUseProduct && aiProductId) {
        payload.productId = aiProductId;
      }

      // Use the same base host as webhooks/CMS API, then swap /webhooks -> /ai
      const webhooksBase = (import.meta as any).env?.VITE_WEBHOOKS_API_BASE || "/api/webhooks";
      const aiBase = webhooksBase.replace(/\/webhooks$/, "");
      const url = `${aiBase}/ai/puck-content`;

      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err?.error || `Request failed with status ${resp.status}`);
      }

      const json = (await resp.json()) as { ok?: boolean; data?: unknown };
      const result = json.data;

      if (!result) {
        throw new Error("AI response missing data");
      }

      if (aiMode === "page") {
        const pageData = result as AiPageData;
        const safeContent = Array.isArray(pageData.content) ? pageData.content : [];
        const normalised = safeContent
          .filter((b) => b && typeof b.type === "string")
          .map((b, index) => ({
            type: b.type,
            props: {
              ...(b.props || {}),
              id: `${b.type}-${Date.now()}-${index}`,
            },
          }));

        setData((prev) => ({
          root:
            pageData.root && typeof pageData.root === "object"
              ? { ...prev.root, ...pageData.root }
              : prev.root,
          content: normalised,
        }));

        setTimeout(() => setPuckKey((prev) => prev + 1), 50);
      } else {
        // section mode: insert blocks below current selection when possible
        const blocks = Array.isArray(result) ? (result as AiBlock[]) : [];
        const filteredBlocks = blocks.filter((b) => b && typeof b.type === "string");
        if (!filteredBlocks.length) {
          throw new Error("AI did not return any blocks to insert");
        }

        const currentContent = Array.isArray(data.content) ? data.content : [];

        let insertIndex = currentContent.length;
        if (currentSelectionId) {
          const idx = currentContent.findIndex(
            (item: any) => item?.props?.id === currentSelectionId,
          );
          if (idx >= 0) insertIndex = idx + 1;
        }

        const newBlocks = filteredBlocks.map((b, idx) => ({
          type: b.type,
          props: {
            ...(b.props || {}),
            id: `${b.type}-${Date.now()}-${idx}`,
          },
        }));

        setData((prev) => {
          const prevContent = Array.isArray(prev.content) ? prev.content : [];
          const before = prevContent.slice(0, insertIndex);
          const after = prevContent.slice(insertIndex);
          return {
            ...prev,
            content: [...before, ...newBlocks, ...after],
          };
        });

        setTimeout(() => setPuckKey((prev) => prev + 1), 50);
      }

      setShowAiDialog(false);
      setAiDescription("");
    } catch (error) {
      console.error("[PuckEditor] AI generation failed", error);
      const msg = error instanceof Error ? error.message : "Unknown error";
      alert(`AI generation failed: ${msg}`);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    loadPageData();
  }, [pageId]);

  // UI Enhancements: sidebar collapse, search, and settings delete button
  useEffect(() => {
    // Defer to allow Puck to render DOM
    const t = setTimeout(() => {
      try {
        // 1) Collapse component categories by default and make them accordion-style
        const applyAccordion = (root: ParentNode) => {
          const details = Array.from(
            root.querySelectorAll<HTMLElement>('details'),
          ) as HTMLDetailsElement[];
          if (!details.length) return;
          details.forEach((d) => {
            // close by default
            d.open = false;
            // avoid multiple listeners
            (d as any)._puckAccordionBound ||
              d.addEventListener('toggle', () => {
                if (d.open) {
                  details.forEach((other) => {
                    if (other !== d) other.open = false;
                  });
                }
              });
            (d as any)._puckAccordionBound = true;
          });
        };

        // 2) Insert a component search box at top of the Components panel
        const componentsPanel = document.querySelector<HTMLElement>('aside');
        if (componentsPanel) {
          // Apply collapsed-by-default + accordion now and on future updates
          const forceClose = () => {
            // Click any header that is currently expanded
            const expanded =
              componentsPanel.querySelectorAll<HTMLElement>(
                '[aria-expanded="true"], details[open]',
              );
            expanded.forEach((el) => {
              // try click the header/summary to toggle closed
              if (el.tagName.toLowerCase() === 'details') {
                (el as HTMLDetailsElement).open = false;
              } else {
                el.click();
              }
            });
          };

          applyAccordion(componentsPanel);
          forceClose();
          const mo = new MutationObserver(() => {
            applyAccordion(componentsPanel);
            forceClose();
          });
          mo.observe(componentsPanel, { childList: true, subtree: true });

          if (!componentsPanel.querySelector('#puck-component-search')) {
            const searchWrap = document.createElement('div');
            searchWrap.style.padding = '8px 12px';
            const input = document.createElement('input');
            input.type = 'text';
            input.id = 'puck-component-search';
            input.placeholder = 'Search components…';
            input.style.width = '100%';
            input.style.border = '1px solid #e5e7eb';
            input.style.borderRadius = '6px';
            input.style.padding = '6px 10px';
            input.style.fontSize = '14px';
            searchWrap.appendChild(input);
            componentsPanel.insertBefore(searchWrap, componentsPanel.firstChild);

            const filterButtons = () => {
              const q = input.value.toLowerCase().trim();
              const buttons =
                componentsPanel.querySelectorAll<HTMLButtonElement>('button');
              buttons.forEach((btn) => {
                const label = (btn.textContent || '').toLowerCase();
                const isCategory =
                  btn.getAttribute('aria-controls') ||
                  btn.getAttribute('aria-expanded');
                if (isCategory) return; // don't hide category headers
                if (!q) {
                  btn.style.display = '';
                } else {
                  btn.style.display = label.includes(q) ? '' : 'none';
                }
              });
            };
            input.addEventListener('input', filterButtons);
          }
        }

        // 3) Add a Delete button in the settings panel to remove the selected block
        const settingsPanel =
          document.querySelector<HTMLElement>(
            '[data-puck-settings-panel], aside ~ div',
          );
        if (settingsPanel && !settingsPanel.querySelector('#puck-delete-block')) {
          const btn = document.createElement('button');
          btn.id = 'puck-delete-block';
          btn.textContent = 'Delete this block';
          Object.assign(btn.style, {
            width: '100%',
            marginTop: '12px',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #ef4444',
            color: '#ef4444',
            background: 'transparent',
            cursor: 'pointer',
          } as CSSStyleDeclaration);
          btn.addEventListener('click', () => {
            // Try to click the built-in delete icon on the currently selected block toolbar
            const toolbarDelete = document.querySelector<HTMLElement>(
              '[aria-label="Delete"], [title="Delete"], .puck-toolbar button[aria-label="Delete"]',
            );
            if (toolbarDelete) {
              toolbarDelete.click();
            } else {
              alert('Select a block to delete.');
            }
          });
          settingsPanel.appendChild(btn);
        }
      } catch {
        // no-op safe guard
      }
    }, 50);
    return () => clearTimeout(t);
  }, [data]);

  // Normalize preview wrappers (frame-root + internal iframe) to eliminate
  // nested scroll and blue-overlay glitches when content is taller than viewport
  useEffect(() => {
    const apply = () => {
      try {
        const fr = document.querySelector<HTMLElement>('#frame-root');
        if (fr) {
          fr.style.height = '100%';
          fr.style.overflowY = 'auto';
          fr.style.overflowX = 'hidden';
          fr.style.transform = 'none';
          // Walk a few levels to fix wrappers
          let node: HTMLElement | null = fr;
          for (let i = 0; i < 4 && node; i++) {
            node.style.minHeight = '0';
            node.style.position = 'relative';
            if (i > 0) {
              node.style.overflow = 'visible';
              node.style.transform = 'none';
            }
            node = (node.firstElementChild as HTMLElement) || null;
          }
        }

        // Puck's AutoFrame uses an internal iframe; when the page is tall the
        // default sizing can cause the preview to "float" with a tinted
        // background. We coerce it into a normal full-size, white-backed frame.
        const editorRoot = document.querySelector<HTMLElement>('.puck-editor-root');
        const iframe = editorRoot?.querySelector<HTMLIFrameElement>('iframe');
        if (iframe) {
          iframe.style.width = '100%';
          iframe.style.display = 'block';
          iframe.style.border = '0';
          iframe.style.transform = 'none';
          iframe.style.maxHeight = 'none';

          try {
            const doc = iframe.contentDocument || (iframe as any).contentWindow?.document;
            if (doc) {
              const html = doc.documentElement as HTMLElement;
              const body = doc.body as HTMLElement;
              if (html) {
                html.style.height = 'auto';
                html.style.minHeight = '100%';
                html.style.overflowX = 'hidden';
              }
              if (body) {
                body.style.margin = '0';
                body.style.background = '#ffffff';
              }

              // Explicitly size iframe to the content height to avoid cropping
              const scrollHeight = Math.max(
                body?.scrollHeight || 0,
                html?.scrollHeight || 0,
              );
              if (scrollHeight > 0) {
                iframe.style.height = scrollHeight + 'px';
              } else {
                // Fallback: ensure at least full viewport height
                iframe.style.height = '100vh';
              }
            }
          } catch {
            // Cross-origin guard; if iframe is not same-origin we silently skip
          }
        }
      } catch {/* ignore */}
    };
    apply();
    const mo = new MutationObserver(apply);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [puckKey]);

  // When the editor is embedded inside an iframe (Backend uses ZenthraEmbed),
  // report our height so the parent can resize the iframe and avoid nested
  // scrollbars / clipped content.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // If there is no parent (top-level window), nothing to report.
    if (window.parent === window) return;

    const sendHeight = () => {
      try {
        const root = document.querySelector<HTMLElement>('.puck-editor-root');
        const rect = root?.getBoundingClientRect();
        const height = rect?.height || document.documentElement.scrollHeight || document.body.scrollHeight || 0;
        if (height > 0) {
          window.parent.postMessage({ type: 'ZENTHRA_EMBED_SIZE', height }, '*');
        }
      } catch {
        // best-effort only
      }
    };

    // Initial send
    sendHeight();

    const ro = new ResizeObserver(() => {
      sendHeight();
    });
    const root = document.querySelector<HTMLElement>('.puck-editor-root');
    if (root) {
      ro.observe(root);
    }

    window.addEventListener('resize', sendHeight);

    return () => {
      window.removeEventListener('resize', sendHeight);
      ro.disconnect();
    };
  }, [puckKey]);

  const loadPageData = async () => {
    try {
      setLoading(true);
      
      if (pageId && pageId !== "new") {
        // Load existing page
        const page = await pocketbase.collection("pages").getOne(pageId);
        setPageMeta({ slug: page.slug, published: !!page.published });
        
        // Parse content_json if it exists
        let pageData = { content: [], root: {} };
        
        if (page.content_json) {
          try {
            // Check if it's already an object or a string
            if (typeof page.content_json === 'string') {
              pageData = JSON.parse(page.content_json);
            } else if (typeof page.content_json === 'object') {
              // Already an object, use it directly
              pageData = page.content_json;
            }
          } catch (parseError) {
            console.error("Error parsing content_json:", parseError);
            // Fallback to empty page
            pageData = { content: [], root: {} };
          }
        }
        
        // Ensure content is an array
        if (!Array.isArray(pageData.content)) {
          pageData.content = [];
        }
        
        // Filter out any invalid components
        pageData.content = pageData.content.filter((item: any) => {
          // Check if the component type exists in our config
          return item && item.type && puckConfig.components[item.type];
        });
        
        setData(pageData);
      } else {
        // New page with completely empty data
        setData({
          content: [],
          root: {},
        });
        setPageMeta({});
      }
    } catch (error) {
      console.error("Error loading page data:", error);
      setData({ content: [], root: {} });
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (newData: PageData) => {
    try {
      setSaving(true);
      
      const pageData = {
        title: newData.root?.title || "Untitled Page",
        slug: generateSlug(newData.root?.title || "untitled-page"),
        content_json: JSON.stringify(newData), // Store as JSON string
        published: true, // Set published flag to true
        status: "published",
      };

      let currentId = pageId && pageId !== "new" ? pageId : null;
      if (currentId) {
        await pocketbase.collection("pages").update(currentId, pageData);
        console.log("Page updated successfully:", currentId);
      } else {
        const newPage = await pocketbase.collection("pages").create(pageData);
        currentId = newPage.id;
        console.log("Page created successfully:", newPage);
        navigate(`/admin/pages/${currentId}/edit`, { replace: true });
      }

      // Capture from the editor preview only (no extra HTML load)
      if (currentId) {
        const dataUrl = await captureEditorSnapshot();
        if (dataUrl) {
          const updated = {
            ...newData,
            root: { ...(newData.root || {}), thumbnail: dataUrl },
          };
          await pocketbase.collection("pages").update(currentId, {
            content_json: JSON.stringify(updated),
          });
        }
      }

      // Show success message
      alert("Page published successfully!");
      setPageMeta({ slug: pageData.slug, published: true });
    } catch (error) {
      console.error("Error saving page:", error);
      const errorMessage = error instanceof Error ? error.message : "Please try again.";
      alert(`Error saving page: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const generateSlug = (title: string): string => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single
      .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
  };

  const handleTemplateSelect = (template: any) => {
    // Insert template content into current page data
    if (template.data?.content) {
      const newContent = template.data.content.map((item: any, index: number) => ({
        type: item.type,
        props: {
          ...item.props,
          id: `${item.type}-${Date.now()}-${index}`,
        },
      }));
      
      setData((prevData) => {
        const updated = {
          ...prevData,
          content: [...prevData.content, ...newContent],
        };
        console.log('Template inserted:', template.name);
        console.log('Previous content:', prevData.content);
        console.log('New content:', updated.content);
        return updated;
      });
      
      // Force Puck to remount with new data
      setTimeout(() => {
        setPuckKey((prev) => prev + 1);
      }, 100);
      
      // Show success notification
      setTimeout(() => {
        alert(`✅ Template "${template.name}" inserted! ${newContent.length} components added to your page.`);
      }, 200);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="puck-editor-root min-h-screen">
      <Puck
        key={puckKey}
        config={puckConfig}
        data={data}
        onPublish={handlePublish}
        overrides={{
          headerActions: ({ children }) => (
            <>
              <Button
                variant="outline"
                onClick={() => navigate("/admin/pages")}
                disabled={saving}
              >
                Back to Pages
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowTemplateDialog(true)}
                disabled={saving}
                className="flex items-center gap-2"
              >
                <Layout size={16} />
                Templates
              </Button>
              <Button
                variant="outline"
                onClick={handleOpenAiDialog}
                disabled={saving}
                className="flex items-center gap-2"
              >
                <Sparkles size={16} />
                AI Generate
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(`/page/${pageMeta.slug}`, "_blank", "noopener,noreferrer")}
                disabled={!pageMeta.published || saving}
              >
                View Page
              </Button>
              <SelectionBridge onChange={setCurrentSelectionId} />
              {children}
            </>
          ),
        }}
        headerTitle={data.root?.title || "Page Editor"}
      />
      {showTemplateDialog && (
        <TemplateDialog
          onClose={() => setShowTemplateDialog(false)}
          onSelect={handleTemplateSelect}
        />
      )}
      {showAiDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => !aiLoading && setShowAiDialog(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Sparkles size={18} /> AI Generate Content
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Generate an entire page or a single section. For sections, AI will insert below the currently selected block when possible.
                </p>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setAiMode("section")}
                  className={`flex-1 rounded-md border px-3 py-2 text-left ${
                    aiMode === "section" ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="font-medium">Single section</div>
                  <div className="text-[11px] text-muted-foreground">
                    Inserts blocks below the current selection.
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setAiMode("page")}
                  className={`flex-1 rounded-md border px-3 py-2 text-left ${
                    aiMode === "page" ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="font-medium">Entire page</div>
                  <div className="text-[11px] text-muted-foreground">
                    Replaces current layout with an AI-generated page.
                  </div>
                </button>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Describe what you want</label>
                <Textarea
                  value={aiDescription}
                  onChange={(e) => setAiDescription(e.target.value)}
                  rows={4}
                  placeholder="Example: Hero section for our best-selling tote bag with bold headline and CTA to Shop"
                />
              </div>
              <div className="flex gap-3 items-center">
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-medium">Tone</label>
                  <Select
                    value={aiTone}
                    onValueChange={(v: any) => setAiTone(v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      <SelectItem value="playful">Playful</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="minimal">Minimal</SelectItem>
                      <SelectItem value="luxury">Luxury</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-medium">Use product context</label>
                  <button
                    type="button"
                    onClick={async () => {
                      const next = !aiUseProduct;
                      setAiUseProduct(next);
                      if (next) await ensureProductOptions();
                    }}
                    className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] ${
                      aiUseProduct ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
                    }`}
                  >
                    {aiUseProduct ? "Enabled" : "Disabled"}
                  </button>
                </div>
                {aiUseProduct && (
                  <div className="space-y-2 text-xs">
                    <Input
                      placeholder="Search products by name or ID"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Select
                      value={aiProductId}
                      onValueChange={(v) => setAiProductId(v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select a product" />
                      </SelectTrigger>
                      <SelectContent className="max-h-56 text-xs">
                        {filteredProductOptions.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} ({p.id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">
                      When enabled, AI will tailor the hero/sections to the selected product.
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t bg-muted/40">
              <Button
                variant="outline"
                size="sm"
                disabled={aiLoading}
                onClick={() => !aiLoading && setShowAiDialog(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleGenerateWithAi}
                disabled={aiLoading}
                className="flex items-center gap-2"
              >
                {aiLoading && (
                  <span className="h-3 w-3 rounded-full border-2 border-t-transparent border-current animate-spin" />
                )}
                Generate
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
