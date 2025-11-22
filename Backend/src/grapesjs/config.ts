import grapesjs from 'grapesjs';
import gjsCustomCode from 'grapesjs-custom-code';
import gjsPluginExport from 'grapesjs-plugin-export';
import { registerAllBlocks } from './blocks';
import { pb } from '@/lib/pocketbase';

// Helper to encode base64 in both browser and Node
const encodeBase64 = (str: string): string => {
  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    return window.btoa(str);
  }
  return Buffer.from(str).toString('base64');
};

export interface GrapesJSConfig {
  container: string | HTMLElement;
  height?: string;
  width?: string;
  storageManager?: any;
  plugins?: any[];
  pluginsOpts?: any;
}

export const createGrapesJSEditor = (config: GrapesJSConfig) => {
  console.log('Creating GrapesJS editor with config:', config);
  
  try {
    const editor = grapesjs.init({
    container: config.container,
    height: config.height || '100vh',
    width: config.width || '100%',
    fromElement: false, // Don't parse container content
    
    // Storage configuration
    storageManager: config.storageManager || {
      type: 'remote',
      autosave: true,
      autoload: true,
      stepsBeforeSave: 1,
    },

    // Asset Manager
    assetManager: {
      upload: false, // Disable default upload to avoid base64 issues
      assets: async () => {
        try {
          console.log('Fetching existing assets from PocketBase...');
          // Fetch latest 50 images from media collection
          const records = await pb.collection('media').getList(1, 50, {
            sort: '-created',
          });
          
          return records.items.map(record => {
            try {
              // Filter for valid image extensions
              if (!/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(record.file)) {
                return null;
              }

              const url = pb.files.getUrl(record, record.file);
              
              // Validate URL to prevent malformed URI errors in Vite/Browser
              try {
                new URL(url);
              } catch (e) {
                console.warn('Skipping invalid asset URL:', url);
                return null;
              }

              console.log('Loaded asset:', url);
              return {
                src: url,
                name: record.file,
              };
            } catch (e) {
              console.warn('Error processing asset record:', record.id, e);
              return null;
            }
          }).filter(Boolean); // Remove failed items
        } catch (error) {
          console.error('Failed to fetch assets:', error);
          return [];
        }
      },
      uploadFile: async (e: any) => {
        const files = e.dataTransfer ? e.dataTransfer.files : e.target.files;
        
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const formData = new FormData();
          formData.append('file', file); // Assuming the field name is 'file' in PocketBase

          try {
            // Upload to 'media' collection (common practice)
            // If you have a different collection name, change 'media' below
            console.log('Uploading file to PocketBase media collection...');
            const record = await pb.collection('media').create(formData);
            
            // Get the URL of the uploaded file
            const url = pb.files.getUrl(record, record.file);
            
            // Add asset to GrapesJS
            editor.AssetManager.add(url);
            console.log('File uploaded successfully:', url);
          } catch (error: any) {
            console.error('Upload failed:', error);
            let msg = error?.message || 'Unknown error';
            if (error?.data?.message) {
              msg += ` (${error.data.message})`;
            }
            if (error?.status === 404) {
              msg = 'Collection "media" not found. Please create it in PocketBase.';
            } else if (error?.status === 403) {
              msg = 'Permission denied. Check API rules for "media" collection.';
            }
            alert(`Upload failed: ${msg}`);
          }
        }
      },
    },

    // Canvas settings
    canvas: {
      styles: [
        'https://cdn.jsdelivr.net/npm/tailwindcss@3.4.11/dist/tailwind.min.css',
      ],
      scripts: [
        'https://cdn.jsdelivr.net/npm/axios@1.6.2/dist/axios.min.js',
        `data:text/javascript;base64,${encodeBase64(`
          // Product Grid Loader
          (function() {
            const POCKETBASE_URL = 'https://backend.karigaistore.in';
            
            function loadProducts() {
              const productGrids = document.querySelectorAll('.product-grid-wrapper');
              
              productGrids.forEach(async (wrapper) => {
                const container = wrapper.querySelector('.product-grid-items');
                if (!container || container.dataset.loaded) return;
                
                container.dataset.loaded = 'true';
                container.innerHTML = '<div class="product-skeleton">Loading products...</div>';
                
                try {
                  const limit = parseInt(wrapper.getAttribute('data-product-limit')) || 8;
                  const category = wrapper.getAttribute('data-product-category') || '';
                  const featuredOnly = wrapper.getAttribute('data-product-featured') === 'true';
                  
                  const response = await fetch(\`\${POCKETBASE_URL}/api/collections/products/records?perPage=\${limit * 2}\`);
                  const data = await response.json();
                  let products = data.items || [];
                  
                  if (featuredOnly) {
                    products = products.filter(p => p.bestseller);
                  }
                  
                  if (category) {
                    const term = category.toLowerCase();
                    products = products.filter(p => {
                      const name = (p.name || '').toLowerCase();
                      const cat = (p.category || '').toLowerCase();
                      return name.includes(term) || cat.includes(term);
                    });
                  }
                  
                  products = products.slice(0, limit);
                  
                  if (products.length === 0) {
                    container.innerHTML = '<p class="product-skeleton">No products found.</p>';
                    return;
                  }
                  
                  container.innerHTML = products.map(product => {
                    const imageUrl = product.image 
                      ? \`\${POCKETBASE_URL}/api/files/\${product.collectionId}/\${product.id}/\${product.image}\`
                      : 'https://placehold.co/300x300/e2e8f0/64748b?text=Product';
                    
                    return \`
                      <div class="product-card">
                        \${product.bestseller ? '<span class="product-badge">Best Seller</span>' : ''}
                        <div class="product-image">
                          <img src="\${imageUrl}" alt="\${product.name || 'Product'}" loading="lazy">
                          <button class="product-wishlist" aria-label="Add to wishlist">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                            </svg>
                          </button>
                        </div>
                        <div class="product-info">
                          <h3 class="product-name">\${product.name || 'Product'}</h3>
                          <div class="product-pricing">
                            <span class="product-price">₹\${product.price || '0.00'}</span>
                            \${product.original_price ? \`<span class="product-original-price">₹\${product.original_price}</span>\` : ''}
                          </div>
                          <button class="product-button">Add to Cart</button>
                        </div>
                      </div>
                    \`;
                  }).join('');
                } catch (error) {
                  console.error('Error loading products:', error);
                  container.innerHTML = '<p class="product-skeleton">Failed to load products.</p>';
                }
              });
            }
            
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', loadProducts);
            } else {
              loadProducts();
            }
            
            // Reload on any changes
            setTimeout(loadProducts, 500);
          })();
        `)}`,
      ],
    },

    // Layer Manager
    layerManager: {
      appendTo: '.layers-container',
    },

    // Block Manager
    blockManager: {
      appendTo: '.blocks-container',
      blocks: [],
    },

    // Style Manager
    styleManager: {
      appendTo: '.styles-container',
      sectors: [
        {
          name: 'General',
          open: true,
          properties: [
            'display',
            'position',
            'top',
            'right',
            'left',
            'bottom',
          ],
        },
        {
          name: 'Dimension',
          open: false,
          properties: [
            'width',
            'height',
            'max-width',
            'min-width',
            'max-height',
            'min-height',
            'margin',
            'padding',
          ],
        },
        {
          name: 'Typography',
          open: false,
          properties: [
            'font-family',
            'font-size',
            'font-weight',
            'letter-spacing',
            'color',
            'line-height',
            'text-align',
            'text-decoration',
            'text-shadow',
          ],
        },
        {
          name: 'Decorations',
          open: false,
          properties: [
            'background-color',
            {
              property: 'background',
              type: 'composite',
              properties: [
                { property: 'background-image', type: 'file' },
                { property: 'background-repeat', type: 'select', defaults: 'repeat' },
                { property: 'background-position', type: 'select', defaults: 'left top' },
                { property: 'background-attachment', type: 'select', defaults: 'scroll' },
                { property: 'background-size', type: 'select', defaults: 'auto' },
              ],
            },
            'border-radius',
            'border',
            'box-shadow',
            'opacity',
          ],
        },
        {
          name: 'Extra',
          open: false,
          properties: ['transition', 'perspective', 'transform'],
        },
        {
          name: 'Flex',
          open: false,
          properties: [
            'flex-direction',
            'flex-wrap',
            'justify-content',
            'align-items',
            'align-content',
            'order',
            'flex-basis',
            'flex-grow',
            'flex-shrink',
            'align-self',
          ],
        },
      ],
    },

    // Trait Manager
    traitManager: {
      appendTo: '.traits-container',
    },

    // Selector Manager
    selectorManager: {
      appendTo: '.selectors-container',
    },

    // Device Manager
    deviceManager: {
      devices: [
        {
          id: 'desktop',
          name: 'Desktop',
          width: '',
        },
        {
          id: 'tablet',
          name: 'Tablet',
          width: '768px',
          widthMedia: '992px',
        },
        {
          id: 'mobile',
          name: 'Mobile',
          width: '320px',
          widthMedia: '480px',
        },
      ],
    },

    // Panels
    panels: {
      defaults: [
        {
          id: 'basic-actions',
          el: '.panel__basic-actions',
          buttons: [
            {
              id: 'visibility',
              active: true,
              className: 'btn-toggle-borders',
              label: '<i class="fa fa-clone"></i>',
              command: 'sw-visibility',
            },
          ],
        },
        {
          id: 'panel-devices',
          el: '.panel__devices',
          buttons: [
            {
              id: 'device-desktop',
              label: '<i class="fa fa-desktop"></i>',
              command: 'set-device-desktop',
              active: true,
              togglable: false,
            },
            {
              id: 'device-tablet',
              label: '<i class="fa fa-tablet"></i>',
              command: 'set-device-tablet',
              togglable: false,
            },
            {
              id: 'device-mobile',
              label: '<i class="fa fa-mobile"></i>',
              command: 'set-device-mobile',
              togglable: false,
            },
          ],
        },
        {
          id: 'panel-switcher',
          el: '.panel__switcher',
          buttons: [
            {
              id: 'show-layers',
              active: true,
              label: '<i class="fa fa-bars"></i>',
              command: 'show-layers',
              togglable: false,
            },
            {
              id: 'show-style',
              active: true,
              label: '<i class="fa fa-paint-brush"></i>',
              command: 'show-styles',
              togglable: false,
            },
            {
              id: 'show-traits',
              active: true,
              label: '<i class="fa fa-cog"></i>',
              command: 'show-traits',
              togglable: false,
            },
          ],
        },
      ],
    },

    // Plugins - Only use essential plugins without block duplicates
    plugins: [
      gjsCustomCode,
      gjsPluginExport,
      ...(config.plugins || []),
    ],

    pluginsOpts: {
      'grapesjs-custom-code': {},
      'grapesjs-plugin-export': {},
      ...(config.pluginsOpts || {}),
    },

    // Commands - will be added after initialization
    // commands: {
    //   defaults: [ ... ]
    // },
  });

    // Define custom commands for panel switching
    const cmdm = editor.Commands;
    
    const hideAllPanels = () => {
      const styles = document.querySelector('.styles-container') as HTMLElement;
      const traits = document.querySelector('.traits-container') as HTMLElement;
      const layers = document.querySelector('.layers-container') as HTMLElement;
      const selectors = document.querySelector('.selectors-container') as HTMLElement;
      
      if (styles) styles.style.display = 'none';
      if (traits) traits.style.display = 'none';
      if (layers) layers.style.display = 'none';
      if (selectors) selectors.style.display = 'none';
    };

    cmdm.add('show-styles', {
      run(editor) {
        hideAllPanels();
        const styles = document.querySelector('.styles-container') as HTMLElement;
        const selectors = document.querySelector('.selectors-container') as HTMLElement;
        if (styles) styles.style.display = 'block';
        if (selectors) selectors.style.display = 'block';
      }
    });

    cmdm.add('show-traits', {
      run(editor) {
        hideAllPanels();
        const traits = document.querySelector('.traits-container') as HTMLElement;
        if (traits) traits.style.display = 'block';
      }
    });

    cmdm.add('show-layers', {
      run(editor) {
        hideAllPanels();
        const layers = document.querySelector('.layers-container') as HTMLElement;
        if (layers) layers.style.display = 'block';
      }
    });

    // Clear all default blocks to prevent duplicates
    editor.BlockManager.getAll().reset();
    
    // Register all custom blocks (eg. Hero block) so they show in the blocks panel
    try {
      registerAllBlocks(editor as any);
      console.log('Custom blocks registered. Total blocks:', editor.BlockManager.getAll().length);
    } catch (e) {
      console.error('Error registering custom GrapesJS blocks:', e);
    }

    // Set default active panel
    editor.runCommand('show-styles');

    console.log('GrapesJS editor created successfully:', editor);
    return editor;
  } catch (error) {
    console.error('Failed to create GrapesJS editor:', error);
    throw error;
  }
};

export default createGrapesJSEditor;
