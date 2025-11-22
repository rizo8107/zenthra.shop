# GrapesJS Migration Guide

## Overview

This document outlines the migration from Puck to GrapesJS for the page builder functionality. GrapesJS provides a native Backend-based visual editor without the need for embedding Frontend components.

## Installation

### 1. Install Dependencies

```bash
cd Backend
npm install
```

This will install the following GrapesJS packages (already added to package.json):
- `grapesjs` - Core library
- `grapesjs-blocks-basic` - Basic blocks
- `grapesjs-plugin-forms` - Form components
- `grapesjs-preset-webpage` - Webpage presets
- `grapesjs-custom-code` - Custom code blocks
- `grapesjs-plugin-export` - Export functionality

### 2. Add Route to Application

Add the GrapesJS editor route to your main routing configuration:

```typescript
// In src/App.tsx or main routing file
import GrapesJSEditor from './pages/GrapesJSEditor';

// Add route
<Route path="/admin/pages/:pageId/edit-grapesjs" element={<GrapesJSEditor />} />
```

### 3. Update PocketBase Schema

Add new fields to the `pages` collection in PocketBase:

```javascript
// Add these fields to the pages collection:
- grapesjs_html (text, optional)
- grapesjs_css (text, optional)
- grapesjs_components (json, optional)
- grapesjs_styles (json, optional)
```

## Architecture

### Directory Structure

```
Backend/
├── src/
│   ├── grapesjs/
│   │   ├── config.ts               # Main GrapesJS configuration
│   │   └── blocks/                 # Custom blocks directory
│   │       ├── index.ts            # Blocks registry
│   │       ├── heroBlock.ts        # Hero section block
│   │       ├── productGridBlock.ts # Product grid (to be created)
│   │       └── ... (more blocks)
│   └── pages/
│       └── GrapesJSEditor.tsx      # Main editor page
```

### Key Files

1. **config.ts**: GrapesJS editor configuration
   - Canvas settings
   - Block manager
   - Style manager
   - Device manager (responsive preview)
   - Panels and commands

2. **GrapesJSEditor.tsx**: React component for the editor
   - Handles page loading and saving
   - Puck-to-GrapesJS migration logic
   - Preview functionality
   - Editor initialization

3. **blocks/**: Custom block definitions
   - Each block replicates a Puck component
   - Includes HTML structure, styles, and traits

## Migration Strategy

### Automatic Migration

The editor includes automatic migration from Puck to GrapesJS:

1. When opening an existing page, the editor checks for `grapesjs_html`
2. If not found, it checks for `content_json` (Puck data)
3. The `convertPuckToHtml()` function translates Puck components to HTML

### Manual Migration

For pages requiring precise conversion:

1. Open the page in the old Puck editor
2. Note the component types and configurations
3. Open the page in GrapesJS editor (auto-migration will create basic HTML)
4. Manually adjust styling and content as needed
5. Save the page

## Creating Custom Blocks

### Example: Hero Block

```typescript
// src/grapesjs/blocks/heroBlock.ts
export const registerHeroBlock = (editor: any) => {
  const blockManager = editor.BlockManager;
  const domComponents = editor.DomComponents;

  // Define component type
  domComponents.addType('hero-section', {
    model: {
      defaults: {
        tagName: 'section',
        classes: ['hero-section'],
        traits: [
          { type: 'text', label: 'Title', name: 'data-title' },
          // ... more traits
        ],
        components: `<!-- HTML structure -->`,
        styles: `/* CSS styles */`,
      },
    },
  });

  // Add to block manager
  blockManager.add('hero-section', {
    label: 'Hero Section',
    category: 'E-commerce',
    content: { type: 'hero-section' },
  });
};
```

### Register in index.ts

```typescript
// src/grapesjs/blocks/index.ts
import { registerHeroBlock } from './heroBlock';
import { registerProductGridBlock } from './productGridBlock';

export const registerAllBlocks = (editor: any) => {
  registerHeroBlock(editor);
  registerProductGridBlock(editor);
  // ... register more blocks
};
```

## Puck Component Mapping

### Components to Migrate

| Puck Component | GrapesJS Block | Status |
|----------------|----------------|--------|
| Hero           | heroBlock.ts   | ✅ Created |
| Text           | Built-in       | ✅ Available |
| Image          | Built-in       | ✅ Available |
| Button         | Built-in       | ✅ Available |
| ProductGrid    | TBD            | ⏳ Pending |
| CardGrid       | TBD            | ⏳ Pending |
| Newsletter     | TBD            | ⏳ Pending |
| Testimonial    | TBD            | ⏳ Pending |
| ... (30+ more) | TBD            | ⏳ Pending |

### Conversion Guidelines

1. **Structure**: Convert React JSX to HTML string
2. **Styling**: Use inline styles or CSS classes with Tailwind
3. **Props**: Map to GrapesJS traits (editable properties)
4. **Interactivity**: Use vanilla JS for dynamic behaviors

## Usage

### Creating a New Page

1. Navigate to `/admin/pages`
2. Click "Create New Page"
3. Choose "Edit with GrapesJS"
4. Drag blocks from the left sidebar onto the canvas
5. Configure blocks using the right sidebar (traits)
6. Style components using the style manager
7. Click "Save" to persist changes

### Editing Existing Pages

#### Puck Pages
- Automatically migrated to HTML on first open
- Lossy conversion (some styling may need adjustment)
- Recommend reviewing and refining after migration

#### GrapesJS Pages
- Load instantly with full fidelity
- All custom blocks and styles preserved

### Preview

Click the "Preview" button to see how the page will render:
- Opens in a new window
- Includes Tailwind CSS
- Shows responsive layout

## AI Integration (Future)

To update AI generation for GrapesJS:

1. **Update gemini.ts**: Generate HTML instead of Puck JSON
2. **Update ai.ts**: Modify endpoints to return GrapesJS-compatible data
3. **Add to Editor**: Include AI generation button in toolbar

Example AI prompt modification:
```typescript
const prompt = `Generate HTML and CSS for a ${type} section with ${description}.
Use semantic HTML5, Tailwind CSS classes, and modern design patterns.
Return JSON: { html: "...", css: "..." }`;
```

## Troubleshooting

### Editor Not Loading
- Check console for errors
- Verify GrapesJS CSS is loaded: `import 'grapesjs/dist/css/grapes.min.css'`
- Ensure container ref is properly set

### Blocks Not Appearing
- Verify blocks are registered in `registerAllBlocks()`
- Check block category names match
- Inspect block manager console logs

### Styles Not Applying
- Check if Tailwind CSS is loaded in canvas
- Verify CSS is saved to `grapesjs_css` field
- Inspect rendered HTML for class names

### Migration Issues
- Review `convertPuckToHtml()` logic
- Add custom mappings for specific Puck components
- Use manual migration for complex pages

## Next Steps

1. ✅ Install dependencies (`npm install`)
2. ✅ Add routing for GrapesJS editor
3. ✅ Update PocketBase schema
4. ⏳ Create remaining custom blocks (30+ components)
5. ⏳ Test migration with existing pages
6. ⏳ Update AI integration
7. ⏳ Train users on new editor

## Resources

- [GrapesJS Documentation](https://grapesjs.com/docs/)
- [GrapesJS GitHub](https://github.com/GrapesJS/grapesjs)
- [Custom Blocks Guide](https://grapesjs.com/docs/modules/Components.html)
- [Plugin Development](https://grapesjs.com/docs/modules/Plugins.html)

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review GrapesJS documentation
3. Inspect browser console for errors
4. Test with a minimal example page

---

**Migration Status**: Phase 1 Complete (Setup & Infrastructure)
**Next Phase**: Component Migration (30+ blocks to create)
**Timeline**: 2-3 weeks for full migration
