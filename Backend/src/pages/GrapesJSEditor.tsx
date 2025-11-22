import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { pb } from '@/lib/pocketbase';
import { Save, Eye, ArrowLeft } from 'lucide-react';
import 'grapesjs/dist/css/grapes.min.css';
import '../grapesjs/theme.css';

// Load FontAwesome for GrapesJS icons
const fontAwesomeLink = document.createElement('link');
fontAwesomeLink.rel = 'stylesheet';
fontAwesomeLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
if (!document.querySelector('link[href*="font-awesome"]')) {
  document.head.appendChild(fontAwesomeLink);
}

// Import GrapesJS config
// Note: Will be dynamically imported to avoid SSR issues
let createGrapesJSEditor: any = null;

export default function GrapesJSEditor() {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const editorRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageData, setPageData] = useState<any>(null);

  const parseSafe = (data: any) => {
    if (!data) return null;
    if (typeof data === 'object') return data;
    try {
      const parsed = JSON.parse(data);
      if (typeof parsed === 'string') {
        // Handle double-stringified JSON
        return JSON.parse(parsed);
      }
      return parsed;
    } catch (e) {
      console.warn('JSON parse failed:', e);
      return null;
    }
  };

  // Initialize GrapesJS Editor
  useEffect(() => {
    const initEditor = async () => {
      try {
        console.log('Starting GrapesJS initialization...');
        
        // Dynamic import to avoid SSR issues
        const configModule = await import('../grapesjs/config');
        console.log('Config module loaded:', configModule);
        createGrapesJSEditor = configModule.createGrapesJSEditor;

        if (!containerRef.current) {
          console.error('Container ref is not ready');
          return;
        }
        
        if (editorRef.current) {
          console.log('Editor already exists');
          return;
        }
        
        console.log('Container ready, loading page data...');

        // Load page data if editing existing page
        let initialHtml = '';
        let initialCss = '';
        let initialComponents = null;
        let initialStyles = null;

        if (pageId && pageId !== 'new') {
          console.log('Loading page:', pageId);
          try {
            const page = await pb.collection('pages').getOne(pageId);
            console.log('Page loaded:', page);
            setPageData(page);

            // Prioritize GrapesJS components
            if (page.grapesjs_components) {
              initialComponents = parseSafe(page.grapesjs_components);
              console.log('Parsed components:', initialComponents ? 'Success' : 'Failed');
            }

            if (page.grapesjs_styles) {
              initialStyles = parseSafe(page.grapesjs_styles);
            }
            
            initialHtml = page.grapesjs_html || '';
            initialCss = page.grapesjs_css || '';

            if (!initialComponents && page.content_json) {
              console.log('Converting Puck data to HTML');
              initialHtml = convertPuckToHtml(page.content_json);
            }
          } catch (err) {
            console.error('Error fetching page:', err);
            alert('Failed to load page data.');
          }
        } else {
          console.log('Creating new page');
        }

        console.log('Initializing GrapesJS editor...');
        // Create editor instance
        const editor = createGrapesJSEditor({
          container: containerRef.current,
          height: 'calc(100vh - 80px)',
          storageManager: {
            type: 'remote',
            autosave: false,
            autoload: false,
            urlStore: '/api/pages/save-grapesjs',
            urlLoad: `/api/pages/load-grapesjs/${pageId}`,
            params: { pageId },
          },
        });

        // Set initial content
        console.log('Setting initial content...');
        
        if (initialComponents) {
          console.log('Setting components from JSON...');
          editor.setComponents(initialComponents);
        } else if (initialHtml) {
          console.log('Setting components from HTML...');
          editor.setComponents(initialHtml);
        }

        if (initialStyles) {
          console.log('Setting styles from JSON...');
          editor.setStyle(initialStyles);
        } else if (initialCss) {
          console.log('Setting styles from CSS...');
          editor.setStyle(initialCss);
        }

        // Force render
        editor.render();

        // Add custom commands
        editor.Commands.add('save-page', {
          run: () => handleSave(editor),
        });

        editor.Commands.add('preview-page', {
          run: () => handlePreview(editor),
        });

        console.log('Editor initialized, setting ref and updating state');
        editorRef.current = editor;
        setLoading(false);
        console.log('GrapesJS initialization complete!');
      } catch (error) {
        console.error('Failed to initialize GrapesJS editor:', error);
        alert('Failed to load GrapesJS editor. Check console for details.');
        setLoading(false);
      }
    };

    console.log('Calling initEditor...');
    initEditor();

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, [pageId]);

  const convertPuckToHtml = (contentJson: any): string => {
    try {
      const puckData = typeof contentJson === 'string' ? JSON.parse(contentJson) : contentJson;
      const components = puckData.content || [];

      // Basic conversion - creates simple HTML structure
      const html = components
        .map((component: any) => {
          const type = component.type || 'div';
          const props = component.props || {};

          // Simple mapping of common Puck components to HTML
          switch (type) {
            case 'Hero':
              return `
                <section class="hero-section py-20 px-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                  <div class="container mx-auto text-center">
                    <h1 class="text-5xl font-bold mb-4">${props.title || 'Hero Title'}</h1>
                    <p class="text-xl mb-8">${props.subtitle || 'Hero subtitle'}</p>
                    ${props.buttonText ? `<button class="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold">${props.buttonText}</button>` : ''}
                  </div>
                </section>
              `;
            case 'Text':
              return `<div class="text-section py-8 px-4"><p class="text-base">${props.text || props.content || 'Text content'}</p></div>`;
            case 'Image':
              return `<div class="image-section py-8 px-4"><img src="${props.src || props.url || ''}" alt="${props.alt || 'Image'}" class="w-full h-auto" /></div>`;
            case 'Button':
              return `<div class="button-section py-4 px-4"><button class="btn px-6 py-3 rounded-lg bg-blue-600 text-white">${props.text || props.label || 'Click me'}</button></div>`;
            default:
              return `<div class="component-${type} py-8 px-4"><p>Component: ${type}</p></div>`;
          }
        })
        .join('\n');

      return `
        <div class="page-container">
          ${html}
        </div>
      `;
    } catch (error) {
      console.error('Error converting Puck to HTML:', error);
      return '<div class="container mx-auto"><h1>Welcome to GrapesJS</h1><p>Start building your page!</p></div>';
    }
  };

  const handleSave = async (editor: any) => {
    try {
      setSaving(true);

      // Ensure we get the HTML/CSS from the editor
      const html = editor.getHtml();
      const css = editor.getCss();
      const components = editor.getComponents();
      const styles = editor.getStyle();

      const saveData = {
        title: pageData?.title || 'Untitled Page',
        slug: pageData?.slug || generateSlug('untitled-page'),
        grapesjs_html: html,
        grapesjs_css: css,
        grapesjs_components: JSON.stringify(components),
        grapesjs_styles: JSON.stringify(styles),
        published: true,
        status: 'published',
      };

      let currentId = pageId && pageId !== 'new' ? pageId : null;

      if (currentId) {
        await pb.collection('pages').update(currentId, saveData);
        console.log('Page updated successfully');
      } else {
        const newPage = await pb.collection('pages').create(saveData);
        currentId = newPage.id;
        console.log('Page created successfully');
        navigate(`/admin/pages/${currentId}/edit-grapesjs`, { replace: true });
      }

      alert('Page saved successfully!');
    } catch (error: any) {
      console.error('Error saving page:', error);
      let errorMessage = 'Error saving page. Please try again.';
      
      if (error?.data?.message) {
        errorMessage = `Save failed: ${error.data.message}`;
      } else if (error?.message) {
        errorMessage = `Save failed: ${error.message}`;
      }
      
      if (JSON.stringify(error).includes('too large') || error?.status === 413) {
        errorMessage = 'Save failed: The page content is too large (likely due to dropped images). Please use image URLs instead of dropping image files directly.';
      }

      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = (editor: any) => {
    const html = editor.getHtml();
    const css = editor.getCss();

    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
      previewWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Preview</title>
            <link href="https://cdn.jsdelivr.net/npm/tailwindcss@3.4.11/dist/tailwind.min.css" rel="stylesheet">
            <style>${css}</style>
          </head>
          <body>
            ${html}
          </body>
        </html>
      `);
      previewWindow.document.close();
    }
  };

  const generateSlug = (title: string): string => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  };
  return (
    <div className="grapesjs-editor-wrapper relative">
      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading GrapesJS Editor...</p>
          </div>
        </div>
      )}

      {/* Top Toolbar */}
      <div className="flex items-center justify-between bg-[#1e1e1e] border-b border-[#3d3d3d] px-4 py-3 shadow-sm">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/pages')}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back
          </Button>
          <h1 className="text-lg font-semibold text-gray-200">
            {pageData?.title || 'New Page'} - GrapesJS Editor
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => editorRef.current && handlePreview(editorRef.current)}
            disabled={saving}
            className="flex items-center gap-2"
          >
            <Eye size={16} />
            Preview
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => editorRef.current && handleSave(editorRef.current)}
            disabled={saving}
            className="flex items-center gap-2"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Panel containers for GrapesJS */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Sidebar - Blocks */}
        <div className="w-64 bg-[#1e1e1e] border-r border-[#3d3d3d] overflow-y-auto flex flex-col">
          <div className="p-2 bg-[#2d2d2d] border-b border-[#3d3d3d] font-semibold text-sm text-gray-300">
            Blocks
          </div>
          <div className="blocks-container p-3 flex-1"></div>
        </div>

        {/* Main Canvas */}
        <div className="flex-1 relative bg-[#1a1a1a]">
          <div className="panel__basic-actions absolute top-2 left-2 z-10"></div>
          <div className="panel__devices absolute top-2 right-2 z-10"></div>
          <div ref={containerRef} className="h-full"></div>
        </div>

        {/* Right Sidebar - Styles, Traits, Layers */}
        <div className="w-80 bg-[#1e1e1e] border-l border-[#3d3d3d] flex flex-col">
          {/* Panel Switcher Tabs */}
          <div className="panel__switcher flex border-b border-[#3d3d3d] bg-[#2d2d2d]"></div>
          
          {/* Tab Contents */}
          <div className="flex-1 overflow-y-auto">
            <div className="styles-container p-3"></div>
            <div className="traits-container p-3"></div>
            <div className="layers-container p-3"></div>
            <div className="selectors-container p-3 border-t border-[#3d3d3d]"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
