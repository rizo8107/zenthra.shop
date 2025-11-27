import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme/theme-provider";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardPage from "./pages/admin/DashboardPage";
import OrdersPage from "./pages/admin/OrdersPage";
import CustomersPage from "./pages/admin/CustomersPage";
import AbandonedCartsPage from "./pages/admin/AbandonedCartsPage";
import ProductsPage from "./pages/admin/ProductsPage";
import SettingsPage from "./pages/admin/SettingsPage";
import CouponsPage from "./pages/admin/CouponsPage";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";
import PwaUpdateNotification from "./components/PwaUpdateNotification";
import ZenthraPagesManager from "./pages/admin/ZenthraPagesManager";
import PagesManagerBackend from "./pages/admin/PagesManagerBackend";
import ZenthraPageEditor from "./pages/admin/ZenthraPageEditor";
import GrapesJSEditor from "./pages/GrapesJSEditor";
import ZenthraThemes from "./pages/admin/ZenthraThemes";
import ZenthraPlugins from "./pages/admin/ZenthraPlugins";
import AutomationFlowsPage from "./pages/admin/AutomationFlowsPage";
import AutomationFlowBuilderPage from "./pages/admin/AutomationFlowBuilderPage";
import NavbarSettingsPage from "./pages/admin/NavbarSettingsPage";
import CheckoutFlowPage from "./pages/admin/CheckoutFlowPage";
import BrandingPage from "./pages/admin/BrandingPage";
import ProductPageEditor from "./pages/admin/ProductPageEditor";
import WhatsAppConfigPage from "./pages/admin/WhatsAppConfigPage";
import CampaignBuilderPage from "./pages/admin/CampaignBuilderPage";

// Set PocketBase URL from environment variable
if (import.meta.env.VITE_POCKETBASE_URL) {
  console.log("PocketBase URL:", import.meta.env.VITE_POCKETBASE_URL);
} else {
  console.warn("PocketBase URL not found in environment variables, using default");
}

// Configure React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App = () => {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => {
            console.log('Service Worker registered: ', registration);
          })
          .catch(registrationError => {
            console.log('Service Worker registration failed: ', registrationError);
          });
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="konipai-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <PwaUpdateNotification />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Navigate to="/login" />} />
              <Route path="/login" element={<LoginPage />} />

              {/* Admin routes */}
              <Route path="/admin" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/admin/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
              <Route path="/admin/customers" element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />
              <Route path="/admin/abandoned-carts" element={<ProtectedRoute><AbandonedCartsPage /></ProtectedRoute>} />
              <Route path="/admin/products" element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />
              <Route path="/admin/product-pages/:pageId/edit" element={<ProtectedRoute><ProductPageEditor /></ProtectedRoute>} />
              <Route path="/admin/coupons" element={<ProtectedRoute><CouponsPage /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/admin/pages" element={<ProtectedRoute><PagesManagerBackend /></ProtectedRoute>} />
              <Route path="/admin/pages-old" element={<ProtectedRoute><ZenthraPagesManager /></ProtectedRoute>} />
              <Route path="/admin/pages/:pageId/edit" element={<ProtectedRoute><ZenthraPageEditor /></ProtectedRoute>} />
              <Route path="/admin/pages/:pageId/edit-grapesjs" element={<ProtectedRoute><GrapesJSEditor /></ProtectedRoute>} />
              <Route path="/admin/themes" element={<ProtectedRoute><ZenthraThemes /></ProtectedRoute>} />
              <Route path="/admin/plugins" element={<ProtectedRoute><ZenthraPlugins /></ProtectedRoute>} />
              <Route path="/admin/navbar" element={<ProtectedRoute><NavbarSettingsPage /></ProtectedRoute>} />
              <Route path="/admin/branding" element={<ProtectedRoute><BrandingPage /></ProtectedRoute>} />
              <Route path="/admin/checkout-flow" element={<ProtectedRoute><CheckoutFlowPage /></ProtectedRoute>} />
              <Route path="/admin/automation" element={<ProtectedRoute><AutomationFlowsPage /></ProtectedRoute>} />
              <Route path="/admin/automation/:flowId" element={<ProtectedRoute><AutomationFlowBuilderPage /></ProtectedRoute>} />
              <Route path="/admin/whatsapp" element={<ProtectedRoute><WhatsAppConfigPage /></ProtectedRoute>} />
              <Route path="/admin/campaigns" element={<ProtectedRoute><CampaignBuilderPage /></ProtectedRoute>} />

              {/* Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
