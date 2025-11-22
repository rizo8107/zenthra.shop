// Custom Product Grid Block for GrapesJS
// Displays a grid of products for e-commerce

export const registerProductGridBlock = (editor: any) => {
  const blockManager = editor.BlockManager;
  const domComponents = editor.DomComponents;

  // Define the Product Grid component
  domComponents.addType('product-grid', {
    model: {
      defaults: {
        tagName: 'section',
        classes: ['product-grid-section'],
        droppable: false,
        traits: [
          {
            type: 'text',
            label: 'Section Title',
            name: 'data-title',
            changeProp: 1,
          },
          {
            type: 'number',
            label: 'Products Per Row',
            name: 'data-columns',
            changeProp: 1,
            min: 1,
            max: 6,
          },
          {
            type: 'number',
            label: 'Max Products',
            name: 'data-limit',
            changeProp: 1,
            min: 1,
            max: 20,
          },
          {
            type: 'select',
            label: 'Category Filter',
            name: 'data-category',
            changeProp: 1,
            options: [
              { value: '', name: 'All Categories' },
              { value: 'electronics', name: 'Electronics' },
              { value: 'clothing', name: 'Clothing' },
              { value: 'books', name: 'Books' },
              { value: 'home', name: 'Home & Garden' },
            ],
          },
        ],
        components: `
          <div class="product-grid-container">
            <h2 class="product-grid-title" data-gjs-editable="true">Featured Products</h2>
            <div class="product-grid">
              <div class="product-card">
                <div class="product-image">
                  <img src="https://via.placeholder.com/300x200" alt="Product 1" />
                </div>
                <div class="product-info">
                  <h3 class="product-name">Sample Product 1</h3>
                  <p class="product-price">₹999</p>
                  <button class="product-button">Add to Cart</button>
                </div>
              </div>
              <div class="product-card">
                <div class="product-image">
                  <img src="https://via.placeholder.com/300x200" alt="Product 2" />
                </div>
                <div class="product-info">
                  <h3 class="product-name">Sample Product 2</h3>
                  <p class="product-price">₹1,299</p>
                  <button class="product-button">Add to Cart</button>
                </div>
              </div>
              <div class="product-card">
                <div class="product-image">
                  <img src="https://via.placeholder.com/300x200" alt="Product 3" />
                </div>
                <div class="product-info">
                  <h3 class="product-name">Sample Product 3</h3>
                  <p class="product-price">₹799</p>
                  <button class="product-button">Add to Cart</button>
                </div>
              </div>
            </div>
          </div>
        `,
        styles: `
          .product-grid-section {
            padding: 60px 20px;
            background: #f8f9fa;
          }
          .product-grid-container {
            max-width: 1200px;
            margin: 0 auto;
          }
          .product-grid-title {
            text-align: center;
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 3rem;
            color: #333;
          }
          .product-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 2rem;
          }
          .product-card {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
          }
          .product-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
          }
          .product-image {
            position: relative;
            overflow: hidden;
          }
          .product-image img {
            width: 100%;
            height: 200px;
            object-fit: cover;
            transition: transform 0.3s ease;
          }
          .product-card:hover .product-image img {
            transform: scale(1.05);
          }
          .product-info {
            padding: 1.5rem;
          }
          .product-name {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #333;
          }
          .product-price {
            font-size: 1.5rem;
            font-weight: 700;
            color: #e74c3c;
            margin-bottom: 1rem;
          }
          .product-button {
            width: 100%;
            background: #3498db;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.3s ease;
          }
          .product-button:hover {
            background: #2980b9;
          }
          @media (max-width: 768px) {
            .product-grid {
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
              gap: 1.5rem;
            }
            .product-grid-title {
              font-size: 2rem;
            }
          }
        `,
      },
      init() {
        this.on('change:attributes', this.handleAttrChange);
      },
      handleAttrChange() {
        const title = this.getAttributes()['data-title'];
        const columns = this.getAttributes()['data-columns'] || 3;

        const titleEl = this.find('.product-grid-title')[0];
        const gridEl = this.find('.product-grid')[0];

        if (title && titleEl) {
          titleEl.components(title);
        }

        if (gridEl) {
          // Update grid columns based on the columns setting
          gridEl.addStyle({
            'grid-template-columns': `repeat(${columns}, 1fr)`,
          });
        }
      },
    },
  });

  // Add block to block manager
  blockManager.add('product-grid', {
    label: `
      <div class="gjs-block-label">
        <i class="fa fa-th"></i>
        <div>Product Grid</div>
      </div>
    `,
    category: 'E-commerce',
    content: { type: 'product-grid' },
    media: '<svg viewBox="0 0 24 24"><path d="M3,3H11V11H3V3M13,3H21V11H13V3M3,13H11V21H3V13M13,13H21V21H13V13Z"/></svg>',
    attributes: { class: 'gjs-block-section' },
  });
};