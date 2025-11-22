// Export all custom blocks
import { registerHeroBlock } from './heroBlock';
import { registerProductGridBlock } from './productGridBlock';
import { registerBasicBlocks } from './basicBlocks';

// Function to register all custom blocks
export const registerAllBlocks = (editor: any) => {
  // Register all blocks
  registerBasicBlocks(editor); // Text, Button, Columns, Features
  registerHeroBlock(editor);
  registerProductGridBlock(editor);
  
  // Add more block registrations here as you create them
  // registerTestimonialBlock(editor);
  // etc.
};

export { registerHeroBlock, registerProductGridBlock, registerBasicBlocks };
