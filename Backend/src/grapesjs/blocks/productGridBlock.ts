// Product Grid block for GrapesJS (backend admin only)
// This is a lightweight implementation whose main purpose is to
// provide a valid registerProductGridBlock export so builds succeed.

// We intentionally keep this implementation simple and self-contained,
// without any direct PocketBase or runtime dependencies. The block
// renders a placeholder section that merchants can style or replace
// later if GrapesJS is used.

// Using `any` for the editor to avoid importing GrapesJS types and
// to keep this file decoupled from the exact editor version.
export const registerProductGridBlock = (editor: any) => {
  if (!editor || !editor.BlockManager) {
    return;
  }

  const blockId = 'product-grid';

  // Avoid double registration if called multiple times
  const existingBlock = editor.BlockManager.get(blockId);
  if (existingBlock) {
    return;
  }

  editor.BlockManager.add(blockId, {
    label: 'Product Grid',
    category: 'Ecommerce',
    attributes: { class: 'fa fa-th-large' },
    content: `
      <section data-block="product-grid" class="gjs-product-grid">
        <div class="product-grid-heading">
          <h2>Product Grid</h2>
          <p>Edit this section or replace it with your own layout.</p>
        </div>
        <div class="product-grid-items">
          <div class="product-card">
            <div class="product-image" style="background:#f3f3f3;height:180px;"></div>
            <h3>Product Title</h3>
            <p class="product-price">₹999</p>
            <button>View Product</button>
          </div>
          <div class="product-card">
            <div class="product-image" style="background:#f3f3f3;height:180px;"></div>
            <h3>Product Title</h3>
            <p class="product-price">₹999</p>
            <button>View Product</button>
          </div>
          <div class="product-card">
            <div class="product-image" style="background:#f3f3f3;height:180px;"></div>
            <h3>Product Title</h3>
            <p class="product-price">₹999</p>
            <button>View Product</button>
          </div>
        </div>
      </section>
    `,
    styles: `
      .gjs-product-grid {
        padding: 40px 20px;
      }
      .gjs-product-grid .product-grid-heading {
        text-align: center;
        margin-bottom: 24px;
      }
      .gjs-product-grid .product-grid-items {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 20px;
      }
      .gjs-product-grid .product-card {
        border: 1px solid #e5e5e5;
        border-radius: 8px;
        padding: 12px;
        text-align: center;
        background: #ffffff;
      }
      .gjs-product-grid .product-card h3 {
        font-size: 16px;
        margin: 12px 0 4px;
      }
      .gjs-product-grid .product-card .product-price {
        font-weight: 600;
        margin-bottom: 8px;
      }
      .gjs-product-grid .product-card button {
        padding: 8px 12px;
        border-radius: 4px;
        border: none;
        background: #111827;
        color: #ffffff;
        cursor: pointer;
      }
      @media (max-width: 768px) {
        .gjs-product-grid .product-grid-items {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 480px) {
        .gjs-product-grid .product-grid-items {
          grid-template-columns: repeat(1, minmax(0, 1fr));
        }
      }
    `,
  });
};

