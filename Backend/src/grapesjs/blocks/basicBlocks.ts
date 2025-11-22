// Basic reusable blocks for GrapesJS

export const registerBasicBlocks = (editor: any) => {
  const blockManager = editor.BlockManager;
  const domComponents = editor.DomComponents;

  // Text Block
  domComponents.addType('text-block', {
    model: {
      defaults: {
        tagName: 'div',
        classes: ['text-block'],
        droppable: true,
        components: '<p data-gjs-editable="true">Edit this text</p>',
        styles: `
          .text-block {
            padding: 20px;
          }
        `,
      },
    },
  });

  blockManager.add('text-block', {
    label: '<i class="fa fa-font"></i> Text',
    category: 'Basic',
    content: { type: 'text-block' },
  });

  // Button Block
  domComponents.addType('button-block', {
    model: {
      defaults: {
        tagName: 'div',
        classes: ['button-wrapper'],
        components: '<button class="custom-button" data-gjs-editable="true">Click Me</button>',
        styles: `
          .button-wrapper {
            padding: 20px;
            text-align: center;
          }
          .custom-button {
            background: #667eea;
            color: white;
            padding: 12px 32px;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }
          .custom-button:hover {
            background: #5568d3;
            transform: translateY(-2px);
          }
        `,
      },
    },
  });

  blockManager.add('button-block', {
    label: '<i class="fa fa-hand-pointer"></i> Button',
    category: 'Basic',
    content: { type: 'button-block' },
  });

  // Column Layout
  domComponents.addType('columns-2', {
    model: {
      defaults: {
        tagName: 'div',
        classes: ['columns-wrapper'],
        droppable: true,
        components: `
          <div class="column"><p data-gjs-editable="true">Column 1</p></div>
          <div class="column"><p data-gjs-editable="true">Column 2</p></div>
        `,
        styles: `
          .columns-wrapper {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
            padding: 20px;
          }
          .column {
            padding: 20px;
          }
          @media (max-width: 768px) {
            .columns-wrapper {
              grid-template-columns: 1fr;
            }
          }
        `,
      },
    },
  });

  blockManager.add('columns-2', {
    label: '<i class="fa fa-columns"></i> 2 Columns',
    category: 'Basic',
    content: { type: 'columns-2' },
  });

  // Feature Block
  domComponents.addType('feature-block', {
    model: {
      defaults: {
        tagName: 'div',
        classes: ['feature-item'],
        components: `
          <div class="feature-icon"><i class="fa fa-star"></i></div>
          <h3 class="feature-title" data-gjs-editable="true">Feature Title</h3>
          <p class="feature-description" data-gjs-editable="true">Description of this feature goes here.</p>
        `,
        styles: `
          .feature-item {
            text-align: center;
            padding: 2rem;
          }
          .feature-icon {
            font-size: 3rem;
            color: #667eea;
            margin-bottom: 1rem;
          }
          .feature-title {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
          }
          .feature-description {
            color: #666;
            line-height: 1.6;
          }
        `,
      },
    },
  });

  blockManager.add('feature-block', {
    label: '<i class="fa fa-magic"></i> Feature',
    category: 'Basic',
    content: { type: 'feature-block' },
  });
};
