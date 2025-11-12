import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializePerformanceOptimizations } from './utils/enhancePerformance'
import { initializeAnalytics } from './utils/initializeAnalytics'
import { PostHogProvider } from 'posthog-js/react'

// Create root and render app
const root = createRoot(document.getElementById("root")!);

const posthogOptions = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  defaults: '2025-05-24',
} as const

root.render(
  <PostHogProvider apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY} options={posthogOptions}>
    <App />
  </PostHogProvider>
);

// Initialize analytics services
initializeAnalytics();

// Initialize performance optimizations after initial render
initializePerformanceOptimizations();
