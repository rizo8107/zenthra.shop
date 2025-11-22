// Custom Hero Block for GrapesJS
// Replicates the Puck Hero component functionality

export const registerHeroBlock = (editor: any) => {
  const blockManager = editor.BlockManager;
  const domComponents = editor.DomComponents;

  // Define the Hero component
  domComponents.addType('hero-section', {
    model: {
      defaults: {
        tagName: 'section',
        classes: ['hero-section'],
        droppable: false,
        traits: [
          {
            type: 'text',
            label: 'Title',
            name: 'data-title',
            changeProp: 1,
          },
          {
            type: 'text',
            label: 'Subtitle',
            name: 'data-subtitle',
            changeProp: 1,
          },
          {
            type: 'text',
            label: 'Button Text',
            name: 'data-button-text',
            changeProp: 1,
          },
          {
            type: 'text',
            label: 'Button Link',
            name: 'data-button-link',
            changeProp: 1,
          },
          {
            type: 'select',
            label: 'Background Style',
            name: 'data-bg-style',
            changeProp: 1,
            options: [
              { value: 'gradient', name: 'Gradient' },
              { value: 'solid', name: 'Solid Color' },
              { value: 'image', name: 'Image' },
            ],
          },
          {
            type: 'select',
            label: 'Alignment',
            name: 'data-align',
            changeProp: 1,
            options: [
              { value: 'center', name: 'Center' },
              { value: 'left', name: 'Left' },
              { value: 'right', name: 'Right' },
            ],
          },
        ],
        components: `
          <div class="hero-container">
            <h1 class="hero-title" data-gjs-editable="true">Welcome to Our Store</h1>
            <p class="hero-subtitle" data-gjs-editable="true">Discover amazing products at great prices</p>
            <button class="hero-button">Shop Now</button>
          </div>
        `,
        styles: `
          .hero-section {
            padding: 80px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            min-height: 500px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .hero-container {
            max-width: 800px;
            margin: 0 auto;
          }
          .hero-title {
            font-size: 3.5rem;
            font-weight: 700;
            margin-bottom: 1rem;
            line-height: 1.2;
          }
          .hero-subtitle {
            font-size: 1.5rem;
            margin-bottom: 2rem;
            opacity: 0.9;
          }
          .hero-button {
            background: white;
            color: #667eea;
            padding: 16px 40px;
            font-size: 1.1rem;
            font-weight: 600;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: transform 0.2s;
          }
          .hero-button:hover {
            transform: scale(1.05);
          }
          @media (max-width: 768px) {
            .hero-title {
              font-size: 2rem;
            }
            .hero-subtitle {
              font-size: 1.1rem;
            }
          }
        `,
      },
      init() {
        this.on('change:attributes', this.handleAttrChange);
      },
      handleAttrChange() {
        const title = this.getAttributes()['data-title'];
        const subtitle = this.getAttributes()['data-subtitle'];
        const buttonText = this.getAttributes()['data-button-text'];

        const titleEl = this.find('.hero-title')[0];
        const subtitleEl = this.find('.hero-subtitle')[0];
        const buttonEl = this.find('.hero-button')[0];

        if (title && titleEl) {
          titleEl.components(title);
        }
        if (subtitle && subtitleEl) {
          subtitleEl.components(subtitle);
        }
        if (buttonText && buttonEl) {
          buttonEl.components(buttonText);
        }
      },
    },
  });

  // Add block to block manager
  blockManager.add('hero-section', {
    label: `
      <div class="gjs-block-label">
        <i class="fa fa-star"></i>
        <div>Hero Section</div>
      </div>
    `,
    category: 'E-commerce',
    content: { type: 'hero-section' },
    media: '<svg viewBox="0 0 24 24"><path d="M22,9 L22,19 C22,20.1 21.1,21 20,21 L4,21 C2.9,21 2,20.1 2,19 L2,9 M22,9 L12,3 L2,9 M12,10 L12,17"/></svg>',
    attributes: { class: 'gjs-block-section' },
  });
};
