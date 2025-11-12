// Debug utility to check environment variable loading
export const debugEnvironment = () => {
  console.log('=== Environment Debug ===');
  
  // Check import.meta.env
  try {
    console.log('import.meta.env:', import.meta.env);
    console.log('import.meta.env.VITE_POCKETBASE_URL:', import.meta.env.VITE_POCKETBASE_URL);
  } catch (e) {
    console.log('import.meta.env not available:', e);
  }
  
  // Check process.env
  try {
    if (typeof process !== 'undefined') {
      console.log('process.env.VITE_POCKETBASE_URL:', process.env.VITE_POCKETBASE_URL);
      console.log('process.env.NODE_ENV:', process.env.NODE_ENV);
    } else {
      console.log('process not available');
    }
  } catch (e) {
    console.log('process.env not available:', e);
  }
  
  // Check window.__ENV__ (if available)
  try {
    if (typeof window !== 'undefined' && (window as any).__ENV__) {
      console.log('window.__ENV__:', (window as any).__ENV__);
    } else {
      console.log('window.__ENV__ not available');
    }
  } catch (e) {
    console.log('window.__ENV__ error:', e);
  }
  
  console.log('=== End Environment Debug ===');
};
