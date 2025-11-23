import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import { DynamicThemeProvider } from "./contexts/ThemeContext";
import { SiteSettingsProvider } from "./contexts/SiteSettingsContext";
import { Toaster } from "@/components/ui/toaster";
import { Routes } from "./routes";
import { MetaPixel } from "./components/MetaPixel";
import { BrandingHead } from "./components/BrandingHead";

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <DynamicThemeProvider>
        <SiteSettingsProvider>
          <AuthProvider>
            <CartProvider>
              {/* Global tracking & SEO/branding head manager */}
              <MetaPixel />
              <BrandingHead />
              <Routes />
              <Toaster />
            </CartProvider>
          </AuthProvider>
        </SiteSettingsProvider>
      </DynamicThemeProvider>
    </ThemeProvider>
  );
}

export default App;
