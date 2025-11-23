// vite.config.ts
import { defineConfig, loadEnv } from "file:///C:/Zenthrashop/zenthra.shop/Backend/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Zenthrashop/zenthra.shop/Backend/node_modules/@vitejs/plugin-react-swc/index.mjs";
import path from "path";
import { componentTagger } from "file:///C:/Zenthrashop/zenthra.shop/Backend/node_modules/lovable-tagger/dist/index.js";
import { VitePWA } from "file:///C:/Zenthrashop/zenthra.shop/Backend/node_modules/vite-plugin-pwa/dist/index.js";
import { existsSync, readFileSync } from "fs";
var __vite_injected_original_dirname = "C:\\Zenthrashop\\zenthra.shop\\Backend";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__vite_injected_original_dirname, ".."), "");
  const whatsAppApiUrl = env.WHATSAPP_API_URL || "https://backend-whatsappapi.7za6uc.easypanel.host";
  const emailApiUrl = env.EMAIL_API_URL || "https://backend-email.7za6uc.easypanel.host/api/email";
  console.log("=".repeat(60));
  console.log("Environment Variables Check:");
  console.log("VITE_POCKETBASE_URL from env:", env.VITE_POCKETBASE_URL);
  console.log("All VITE_ variables:", Object.keys(env).filter((k) => k.startsWith("VITE_")));
  console.log("envDir:", path.resolve(__vite_injected_original_dirname, ".."));
  console.log("=".repeat(60));
  if (!env.VITE_POCKETBASE_URL) {
    console.error("\u26A0\uFE0F  WARNING: VITE_POCKETBASE_URL is not set in .env file!");
    console.error("\u26A0\uFE0F  Please ensure the .env file at the root has: VITE_POCKETBASE_URL=https://your-backend-url");
  }
  let serverPort = env.SERVER_PORT || "3001";
  const portInfoPath = path.resolve(__vite_injected_original_dirname, "port-info.json");
  if (existsSync(portInfoPath)) {
    try {
      const portInfo = JSON.parse(readFileSync(portInfoPath, "utf-8"));
      if (portInfo.port) {
        serverPort = String(portInfo.port);
      }
    } catch (e) {
      console.warn("Could not read port-info.json, using default port");
    }
  }
  const webhookServerUrlRaw = (env.WEBHOOK_SERVER_URL || "").trim();
  let webhookServerOrigin = "";
  if (webhookServerUrlRaw) {
    try {
      const u = new URL(webhookServerUrlRaw);
      webhookServerOrigin = u.origin;
    } catch {
      console.warn(`Invalid WEBHOOK_SERVER_URL: ${webhookServerUrlRaw}. Falling back to http://localhost:${serverPort}`);
    }
  }
  if (!webhookServerOrigin) {
    webhookServerOrigin = `http://localhost:${serverPort}`;
  }
  console.log(`WhatsApp API URL: ${whatsAppApiUrl}`);
  console.log(`Email API URL: ${emailApiUrl}`);
  console.log(`Webhook Server Origin: ${webhookServerOrigin}`);
  const useProxies = mode === "development";
  console.log(`Using proxies for API calls: ${useProxies}`);
  const config = {
    envDir: path.resolve(__vite_injected_original_dirname, ".."),
    // Use root .env file
    envPrefix: ["VITE_"],
    // Expose all VITE_ prefixed variables to the client
    // Allow overriding base via env var. Defaults:
    // - production: '/' (served on its own origin)
    // - development: '/'
    base: env.VITE_CMS_BASE || "/",
    server: {
      host: "::",
      port: 8080,
      proxy: {}
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      VitePWA({
        registerType: "prompt",
        includeAssets: ["favicon.ico", "apple-touch-icon.png", "masked-icon.svg"],
        workbox: {
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024
          // 3 MB
        },
        manifest: {
          name: "Zenthra Shop",
          short_name: "Zenthra",
          description: "Zenthra Shop Admin",
          theme_color: "#ffffff",
          background_color: "#ffffff",
          display: "standalone",
          scope: "/",
          start_url: "/",
          orientation: "portrait",
          icons: [
            {
              src: "pwa-192x192.png",
              sizes: "192x192",
              type: "image/png"
            },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png"
            },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable"
            }
          ]
        }
      })
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, "./src")
      }
    },
    define: {
      // Make API URLs available to the app (VITE_POCKETBASE_URL is auto-exposed via envPrefix)
      "import.meta.env.VITE_WHATSAPP_API_URL": JSON.stringify(
        useProxies ? "/whatsapp-api" : whatsAppApiUrl
      ),
      "import.meta.env.VITE_EMAIL_API_URL": JSON.stringify(
        useProxies ? "/email-api" : emailApiUrl
      ),
      "import.meta.env.VITE_WEBHOOKS_API_BASE": JSON.stringify(
        useProxies ? "/api/webhooks" : new URL("/api/webhooks", webhookServerOrigin).toString()
      ),
      "import.meta.env.VITE_VAPID_PUBLIC_KEY": JSON.stringify(env.VITE_VAPID_PUBLIC_KEY)
    }
  };
  if (useProxies && config.server?.proxy) {
    config.server.proxy = {
      "/api/webhooks": {
        target: webhookServerOrigin,
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on("error", (err) => {
            console.log("Webhook proxy error:", err);
          });
          proxy.on("proxyReq", (proxyReq, req) => {
            console.log("Sending Webhook Request:", req.method, req.url);
          });
          proxy.on("proxyRes", (proxyRes, req) => {
            console.log("Received Webhook Response:", proxyRes.statusCode, req.url);
          });
        }
      },
      "/api/customer-journey": {
        target: webhookServerOrigin,
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on("error", (err) => {
            console.log("CustomerJourney proxy error:", err);
          });
          proxy.on("proxyReq", (proxyReq, req) => {
            console.log("Sending Journey Request:", req.method, req.url);
          });
          proxy.on("proxyRes", (proxyRes, req) => {
            console.log("Received Journey Response:", proxyRes.statusCode, req.url);
          });
        }
      },
      "/whatsapp-api": {
        target: whatsAppApiUrl,
        changeOrigin: true,
        rewrite: (path2) => path2.replace(/^\/whatsapp-api/, ""),
        secure: false,
        configure: (proxy) => {
          proxy.on("proxyRes", (proxyRes, req, res) => {
            if (res.setHeader) {
              res.setHeader("Access-Control-Allow-Origin", "*");
              res.setHeader("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
              res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
            }
          });
          proxy.on("error", (err) => {
            console.log("WhatsApp proxy error:", err);
          });
          proxy.on("proxyReq", (proxyReq, req) => {
            console.log("Sending WhatsApp Request:", req.method, req.url);
          });
          proxy.on("proxyRes", (proxyRes, req) => {
            console.log("Received WhatsApp Response:", proxyRes.statusCode, req.url);
          });
        }
      },
      "/email-api": {
        target: emailApiUrl,
        changeOrigin: true,
        rewrite: (path2) => path2.replace(/^\/email-api/, ""),
        secure: false,
        configure: (proxy) => {
          proxy.on("error", (err) => {
            console.log("Email proxy error:", err);
          });
          proxy.on("proxyReq", (proxyReq, req) => {
            console.log("Sending Email Request:", req.method, req.url);
          });
          proxy.on("proxyRes", (proxyRes, req) => {
            console.log("Received Email Response:", proxyRes.statusCode, req.url);
          });
        }
      }
    };
  }
  return config;
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxaZW50aHJhc2hvcFxcXFx6ZW50aHJhLnNob3BcXFxcQmFja2VuZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcWmVudGhyYXNob3BcXFxcemVudGhyYS5zaG9wXFxcXEJhY2tlbmRcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1plbnRocmFzaG9wL3plbnRocmEuc2hvcC9CYWNrZW5kL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBsb2FkRW52LCBVc2VyQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcclxuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0IHsgY29tcG9uZW50VGFnZ2VyIH0gZnJvbSBcImxvdmFibGUtdGFnZ2VyXCI7XHJcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tICd2aXRlLXBsdWdpbi1wd2EnO1xyXG5pbXBvcnQgdHlwZSB7IEluY29taW5nTWVzc2FnZSwgU2VydmVyUmVzcG9uc2UsIENsaWVudFJlcXVlc3QgfSBmcm9tICdodHRwJztcclxuaW1wb3J0IHsgZXhpc3RzU3luYywgcmVhZEZpbGVTeW5jIH0gZnJvbSAnZnMnO1xyXG5cclxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4ge1xyXG4gIC8vIExvYWQgZW52IHZhcmlhYmxlcyBmcm9tIHJvb3QgZGlyZWN0b3J5IChwYXJlbnQgZm9sZGVyKVxyXG4gIGNvbnN0IGVudiA9IGxvYWRFbnYobW9kZSwgcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uJyksICcnKTtcclxuXHJcbiAgLy8gR2V0IEFQSSBVUkxzIGZyb20gLmVudiBvciB1c2UgZGVmYXVsdHNcclxuICBjb25zdCB3aGF0c0FwcEFwaVVybCA9IGVudi5XSEFUU0FQUF9BUElfVVJMIHx8ICdodHRwczovL2JhY2tlbmQtd2hhdHNhcHBhcGkuN3phNnVjLmVhc3lwYW5lbC5ob3N0JztcclxuICBjb25zdCBlbWFpbEFwaVVybCA9IGVudi5FTUFJTF9BUElfVVJMIHx8ICdodHRwczovL2JhY2tlbmQtZW1haWwuN3phNnVjLmVhc3lwYW5lbC5ob3N0L2FwaS9lbWFpbCc7XHJcbiAgXHJcbiAgLy8gTG9nIFBvY2tldEJhc2UgVVJMIGZyb20gZW52XHJcbiAgY29uc29sZS5sb2coJz0nLnJlcGVhdCg2MCkpO1xyXG4gIGNvbnNvbGUubG9nKCdFbnZpcm9ubWVudCBWYXJpYWJsZXMgQ2hlY2s6Jyk7XHJcbiAgY29uc29sZS5sb2coJ1ZJVEVfUE9DS0VUQkFTRV9VUkwgZnJvbSBlbnY6JywgZW52LlZJVEVfUE9DS0VUQkFTRV9VUkwpO1xyXG4gIGNvbnNvbGUubG9nKCdBbGwgVklURV8gdmFyaWFibGVzOicsIE9iamVjdC5rZXlzKGVudikuZmlsdGVyKGsgPT4gay5zdGFydHNXaXRoKCdWSVRFXycpKSk7XHJcbiAgY29uc29sZS5sb2coJ2VudkRpcjonLCBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4nKSk7XHJcbiAgY29uc29sZS5sb2coJz0nLnJlcGVhdCg2MCkpO1xyXG4gIGlmICghZW52LlZJVEVfUE9DS0VUQkFTRV9VUkwpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ1x1MjZBMFx1RkUwRiAgV0FSTklORzogVklURV9QT0NLRVRCQVNFX1VSTCBpcyBub3Qgc2V0IGluIC5lbnYgZmlsZSEnKTtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ1x1MjZBMFx1RkUwRiAgUGxlYXNlIGVuc3VyZSB0aGUgLmVudiBmaWxlIGF0IHRoZSByb290IGhhczogVklURV9QT0NLRVRCQVNFX1VSTD1odHRwczovL3lvdXItYmFja2VuZC11cmwnKTtcclxuICB9XHJcbiAgXHJcbiAgLy8gVHJ5IHRvIHJlYWQgcG9ydCBmcm9tIHBvcnQtaW5mby5qc29uLCBmYWxsYmFjayB0byBlbnYgb3IgZGVmYXVsdFxyXG4gIGxldCBzZXJ2ZXJQb3J0ID0gZW52LlNFUlZFUl9QT1JUIHx8ICczMDAxJztcclxuICBjb25zdCBwb3J0SW5mb1BhdGggPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAncG9ydC1pbmZvLmpzb24nKTtcclxuICBpZiAoZXhpc3RzU3luYyhwb3J0SW5mb1BhdGgpKSB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBwb3J0SW5mbyA9IEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKHBvcnRJbmZvUGF0aCwgJ3V0Zi04JykpO1xyXG4gICAgICBpZiAocG9ydEluZm8ucG9ydCkge1xyXG4gICAgICAgIHNlcnZlclBvcnQgPSBTdHJpbmcocG9ydEluZm8ucG9ydCk7XHJcbiAgICAgIH1cclxuICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgY29uc29sZS53YXJuKCdDb3VsZCBub3QgcmVhZCBwb3J0LWluZm8uanNvbiwgdXNpbmcgZGVmYXVsdCBwb3J0Jyk7XHJcbiAgICB9XHJcbiAgfVxyXG4gIC8vIE5vcm1hbGl6ZSB3ZWJob29rIHNlcnZlciBvcmlnaW47IGFjY2VwdCBmdWxsIFVSTCBvciBVUkwgd2l0aCBwYXRoLCBvdGhlcndpc2UgZmFsbGJhY2tcclxuICBjb25zdCB3ZWJob29rU2VydmVyVXJsUmF3ID0gKGVudi5XRUJIT09LX1NFUlZFUl9VUkwgfHwgJycpLnRyaW0oKTtcclxuICBsZXQgd2ViaG9va1NlcnZlck9yaWdpbiA9ICcnO1xyXG4gIGlmICh3ZWJob29rU2VydmVyVXJsUmF3KSB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCB1ID0gbmV3IFVSTCh3ZWJob29rU2VydmVyVXJsUmF3KTtcclxuICAgICAgLy8gS2VlcCBvbmx5IHRoZSBvcmlnaW4gKHByb3RvY29sICsgaG9zdFs6cG9ydF0pIHRvIHVzZSB3aXRoIHByb3h5IHRhcmdldCBhbmQgQVBJIGJhc2VcclxuICAgICAgd2ViaG9va1NlcnZlck9yaWdpbiA9IHUub3JpZ2luO1xyXG4gICAgfSBjYXRjaCB7XHJcbiAgICAgIC8vIEludmFsaWQgVVJMIHByb3ZpZGVkIChlLmcuLCAnYXBpL3dlYmhvb2tzLycpOyB3ZSdsbCBmYWxsYmFjayBiZWxvd1xyXG4gICAgICBjb25zb2xlLndhcm4oYEludmFsaWQgV0VCSE9PS19TRVJWRVJfVVJMOiAke3dlYmhvb2tTZXJ2ZXJVcmxSYXd9LiBGYWxsaW5nIGJhY2sgdG8gaHR0cDovL2xvY2FsaG9zdDoke3NlcnZlclBvcnR9YCk7XHJcbiAgICB9XHJcbiAgfVxyXG4gIGlmICghd2ViaG9va1NlcnZlck9yaWdpbikge1xyXG4gICAgd2ViaG9va1NlcnZlck9yaWdpbiA9IGBodHRwOi8vbG9jYWxob3N0OiR7c2VydmVyUG9ydH1gO1xyXG4gIH1cclxuXHJcbiAgY29uc29sZS5sb2coYFdoYXRzQXBwIEFQSSBVUkw6ICR7d2hhdHNBcHBBcGlVcmx9YCk7XHJcbiAgY29uc29sZS5sb2coYEVtYWlsIEFQSSBVUkw6ICR7ZW1haWxBcGlVcmx9YCk7XHJcbiAgY29uc29sZS5sb2coYFdlYmhvb2sgU2VydmVyIE9yaWdpbjogJHt3ZWJob29rU2VydmVyT3JpZ2lufWApO1xyXG5cclxuICAvLyBEZXRlcm1pbmUgaWYgd2UgbmVlZCBwcm94aWVzIGZvciBkZXZlbG9wbWVudCBtb2RlXHJcbiAgY29uc3QgdXNlUHJveGllcyA9IG1vZGUgPT09ICdkZXZlbG9wbWVudCc7XHJcbiAgY29uc29sZS5sb2coYFVzaW5nIHByb3hpZXMgZm9yIEFQSSBjYWxsczogJHt1c2VQcm94aWVzfWApO1xyXG5cclxuICAvLyBCYXNlIGNvbmZpZ1xyXG4gIGNvbnN0IGNvbmZpZzogVXNlckNvbmZpZyA9IHtcclxuICAgIGVudkRpcjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uJyksIC8vIFVzZSByb290IC5lbnYgZmlsZVxyXG4gICAgZW52UHJlZml4OiBbJ1ZJVEVfJ10sIC8vIEV4cG9zZSBhbGwgVklURV8gcHJlZml4ZWQgdmFyaWFibGVzIHRvIHRoZSBjbGllbnRcclxuICAgIC8vIEFsbG93IG92ZXJyaWRpbmcgYmFzZSB2aWEgZW52IHZhci4gRGVmYXVsdHM6XHJcbiAgICAvLyAtIHByb2R1Y3Rpb246ICcvJyAoc2VydmVkIG9uIGl0cyBvd24gb3JpZ2luKVxyXG4gICAgLy8gLSBkZXZlbG9wbWVudDogJy8nXHJcbiAgICBiYXNlOiBlbnYuVklURV9DTVNfQkFTRSB8fCAnLycsXHJcbiAgICBzZXJ2ZXI6IHtcclxuICAgICAgaG9zdDogXCI6OlwiLFxyXG4gICAgICBwb3J0OiA4MDgwLFxyXG4gICAgICBwcm94eToge31cclxuICAgIH0sXHJcbiAgICBwbHVnaW5zOiBbXHJcbiAgICAgIHJlYWN0KCksXHJcbiAgICAgIG1vZGUgPT09ICdkZXZlbG9wbWVudCcgJiYgY29tcG9uZW50VGFnZ2VyKCksXHJcbiAgICAgIFZpdGVQV0Eoe1xyXG4gICAgICAgIHJlZ2lzdGVyVHlwZTogJ3Byb21wdCcsXHJcbiAgICAgICAgaW5jbHVkZUFzc2V0czogWydmYXZpY29uLmljbycsICdhcHBsZS10b3VjaC1pY29uLnBuZycsICdtYXNrZWQtaWNvbi5zdmcnXSxcclxuICAgICAgICB3b3JrYm94OiB7XHJcbiAgICAgICAgICBtYXhpbXVtRmlsZVNpemVUb0NhY2hlSW5CeXRlczogMyAqIDEwMjQgKiAxMDI0LCAvLyAzIE1CXHJcbiAgICAgICAgfSxcclxuICAgICAgICBtYW5pZmVzdDoge1xyXG4gICAgICAgICAgbmFtZTogJ1plbnRocmEgU2hvcCcsXHJcbiAgICAgICAgICBzaG9ydF9uYW1lOiAnWmVudGhyYScsXHJcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ1plbnRocmEgU2hvcCBBZG1pbicsXHJcbiAgICAgICAgICB0aGVtZV9jb2xvcjogJyNmZmZmZmYnLFxyXG4gICAgICAgICAgYmFja2dyb3VuZF9jb2xvcjogJyNmZmZmZmYnLFxyXG4gICAgICAgICAgZGlzcGxheTogJ3N0YW5kYWxvbmUnLFxyXG4gICAgICAgICAgc2NvcGU6ICcvJyxcclxuICAgICAgICAgIHN0YXJ0X3VybDogJy8nLFxyXG4gICAgICAgICAgb3JpZW50YXRpb246ICdwb3J0cmFpdCcsXHJcbiAgICAgICAgICBpY29uczogW1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgc3JjOiAncHdhLTE5MngxOTIucG5nJyxcclxuICAgICAgICAgICAgICBzaXplczogJzE5MngxOTInLFxyXG4gICAgICAgICAgICAgIHR5cGU6ICdpbWFnZS9wbmcnLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgc3JjOiAncHdhLTUxMng1MTIucG5nJyxcclxuICAgICAgICAgICAgICBzaXplczogJzUxMng1MTInLFxyXG4gICAgICAgICAgICAgIHR5cGU6ICdpbWFnZS9wbmcnLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgc3JjOiAncHdhLTUxMng1MTIucG5nJyxcclxuICAgICAgICAgICAgICBzaXplczogJzUxMng1MTInLFxyXG4gICAgICAgICAgICAgIHR5cGU6ICdpbWFnZS9wbmcnLFxyXG4gICAgICAgICAgICAgIHB1cnBvc2U6ICdhbnkgbWFza2FibGUnLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgXSxcclxuICAgICAgICB9LFxyXG4gICAgICB9KVxyXG4gICAgXS5maWx0ZXIoQm9vbGVhbiksXHJcbiAgICByZXNvbHZlOiB7XHJcbiAgICAgIGFsaWFzOiB7XHJcbiAgICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gICAgZGVmaW5lOiB7XHJcbiAgICAgIC8vIE1ha2UgQVBJIFVSTHMgYXZhaWxhYmxlIHRvIHRoZSBhcHAgKFZJVEVfUE9DS0VUQkFTRV9VUkwgaXMgYXV0by1leHBvc2VkIHZpYSBlbnZQcmVmaXgpXHJcbiAgICAgICdpbXBvcnQubWV0YS5lbnYuVklURV9XSEFUU0FQUF9BUElfVVJMJzogSlNPTi5zdHJpbmdpZnkoXHJcbiAgICAgICAgdXNlUHJveGllcyA/ICcvd2hhdHNhcHAtYXBpJyA6IHdoYXRzQXBwQXBpVXJsXHJcbiAgICAgICksXHJcbiAgICAgICdpbXBvcnQubWV0YS5lbnYuVklURV9FTUFJTF9BUElfVVJMJzogSlNPTi5zdHJpbmdpZnkoXHJcbiAgICAgICAgdXNlUHJveGllcyA/ICcvZW1haWwtYXBpJyA6IGVtYWlsQXBpVXJsXHJcbiAgICAgICksXHJcbiAgICAgICdpbXBvcnQubWV0YS5lbnYuVklURV9XRUJIT09LU19BUElfQkFTRSc6IEpTT04uc3RyaW5naWZ5KFxyXG4gICAgICAgIHVzZVByb3hpZXMgPyAnL2FwaS93ZWJob29rcycgOiBuZXcgVVJMKCcvYXBpL3dlYmhvb2tzJywgd2ViaG9va1NlcnZlck9yaWdpbikudG9TdHJpbmcoKVxyXG4gICAgICApLFxyXG4gICAgICAnaW1wb3J0Lm1ldGEuZW52LlZJVEVfVkFQSURfUFVCTElDX0tFWSc6IEpTT04uc3RyaW5naWZ5KGVudi5WSVRFX1ZBUElEX1BVQkxJQ19LRVkpLFxyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIC8vIEFkZCBwcm94aWVzIG9ubHkgZm9yIGRldmVsb3BtZW50IG1vZGVcclxuICBpZiAodXNlUHJveGllcyAmJiBjb25maWcuc2VydmVyPy5wcm94eSkge1xyXG4gICAgY29uZmlnLnNlcnZlci5wcm94eSA9IHtcclxuICAgICAgJy9hcGkvd2ViaG9va3MnOiB7XHJcbiAgICAgICAgdGFyZ2V0OiB3ZWJob29rU2VydmVyT3JpZ2luLFxyXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgICBzZWN1cmU6IGZhbHNlLFxyXG4gICAgICAgIGNvbmZpZ3VyZTogKHByb3h5KSA9PiB7XHJcbiAgICAgICAgICBwcm94eS5vbignZXJyb3InLCAoZXJyOiBFcnJvcikgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnV2ViaG9vayBwcm94eSBlcnJvcjonLCBlcnIpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgICBwcm94eS5vbigncHJveHlSZXEnLCAocHJveHlSZXE6IENsaWVudFJlcXVlc3QsIHJlcTogSW5jb21pbmdNZXNzYWdlKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTZW5kaW5nIFdlYmhvb2sgUmVxdWVzdDonLCByZXEubWV0aG9kLCByZXEudXJsKTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgcHJveHkub24oJ3Byb3h5UmVzJywgKHByb3h5UmVzOiBJbmNvbWluZ01lc3NhZ2UsIHJlcTogSW5jb21pbmdNZXNzYWdlKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdSZWNlaXZlZCBXZWJob29rIFJlc3BvbnNlOicsIHByb3h5UmVzLnN0YXR1c0NvZGUsIHJlcS51cmwpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG4gICAgICAnL2FwaS9jdXN0b21lci1qb3VybmV5Jzoge1xyXG4gICAgICAgIHRhcmdldDogd2ViaG9va1NlcnZlck9yaWdpbixcclxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXHJcbiAgICAgICAgc2VjdXJlOiBmYWxzZSxcclxuICAgICAgICBjb25maWd1cmU6IChwcm94eSkgPT4ge1xyXG4gICAgICAgICAgcHJveHkub24oJ2Vycm9yJywgKGVycjogRXJyb3IpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ0N1c3RvbWVySm91cm5leSBwcm94eSBlcnJvcjonLCBlcnIpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgICBwcm94eS5vbigncHJveHlSZXEnLCAocHJveHlSZXE6IENsaWVudFJlcXVlc3QsIHJlcTogSW5jb21pbmdNZXNzYWdlKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTZW5kaW5nIEpvdXJuZXkgUmVxdWVzdDonLCByZXEubWV0aG9kLCByZXEudXJsKTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgcHJveHkub24oJ3Byb3h5UmVzJywgKHByb3h5UmVzOiBJbmNvbWluZ01lc3NhZ2UsIHJlcTogSW5jb21pbmdNZXNzYWdlKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdSZWNlaXZlZCBKb3VybmV5IFJlc3BvbnNlOicsIHByb3h5UmVzLnN0YXR1c0NvZGUsIHJlcS51cmwpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG4gICAgICAnL3doYXRzYXBwLWFwaSc6IHtcclxuICAgICAgICB0YXJnZXQ6IHdoYXRzQXBwQXBpVXJsLFxyXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgICByZXdyaXRlOiAocGF0aDogc3RyaW5nKSA9PiBwYXRoLnJlcGxhY2UoL15cXC93aGF0c2FwcC1hcGkvLCAnJyksXHJcbiAgICAgICAgc2VjdXJlOiBmYWxzZSxcclxuICAgICAgICBjb25maWd1cmU6IChwcm94eSkgPT4ge1xyXG4gICAgICAgICAgcHJveHkub24oJ3Byb3h5UmVzJywgKHByb3h5UmVzOiBJbmNvbWluZ01lc3NhZ2UsIHJlcTogSW5jb21pbmdNZXNzYWdlLCByZXM6IFNlcnZlclJlc3BvbnNlKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChyZXMuc2V0SGVhZGVyKSB7XHJcbiAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJywgJyonKTtcclxuICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJywgJ0dFVCxQVVQsUE9TVCxERUxFVEUsT1BUSU9OUycpO1xyXG4gICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnLCAnQ29udGVudC1UeXBlLCBBdXRob3JpemF0aW9uJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgcHJveHkub24oJ2Vycm9yJywgKGVycjogRXJyb3IpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1doYXRzQXBwIHByb3h5IGVycm9yOicsIGVycik7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICAgIHByb3h5Lm9uKCdwcm94eVJlcScsIChwcm94eVJlcTogQ2xpZW50UmVxdWVzdCwgcmVxOiBJbmNvbWluZ01lc3NhZ2UpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1NlbmRpbmcgV2hhdHNBcHAgUmVxdWVzdDonLCByZXEubWV0aG9kLCByZXEudXJsKTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgcHJveHkub24oJ3Byb3h5UmVzJywgKHByb3h5UmVzOiBJbmNvbWluZ01lc3NhZ2UsIHJlcTogSW5jb21pbmdNZXNzYWdlKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdSZWNlaXZlZCBXaGF0c0FwcCBSZXNwb25zZTonLCBwcm94eVJlcy5zdGF0dXNDb2RlLCByZXEudXJsKTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuICAgICAgJy9lbWFpbC1hcGknOiB7XHJcbiAgICAgICAgdGFyZ2V0OiBlbWFpbEFwaVVybCxcclxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXHJcbiAgICAgICAgcmV3cml0ZTogKHBhdGg6IHN0cmluZykgPT4gcGF0aC5yZXBsYWNlKC9eXFwvZW1haWwtYXBpLywgJycpLFxyXG4gICAgICAgIHNlY3VyZTogZmFsc2UsXHJcbiAgICAgICAgY29uZmlndXJlOiAocHJveHkpID0+IHtcclxuICAgICAgICAgIHByb3h5Lm9uKCdlcnJvcicsIChlcnI6IEVycm9yKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdFbWFpbCBwcm94eSBlcnJvcjonLCBlcnIpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgICBwcm94eS5vbigncHJveHlSZXEnLCAocHJveHlSZXE6IENsaWVudFJlcXVlc3QsIHJlcTogSW5jb21pbmdNZXNzYWdlKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTZW5kaW5nIEVtYWlsIFJlcXVlc3Q6JywgcmVxLm1ldGhvZCwgcmVxLnVybCk7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICAgIHByb3h5Lm9uKCdwcm94eVJlcycsIChwcm94eVJlczogSW5jb21pbmdNZXNzYWdlLCByZXE6IEluY29taW5nTWVzc2FnZSkgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnUmVjZWl2ZWQgRW1haWwgUmVzcG9uc2U6JywgcHJveHlSZXMuc3RhdHVzQ29kZSwgcmVxLnVybCk7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIGNvbmZpZztcclxufSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBbVMsU0FBUyxjQUFjLGVBQTJCO0FBQ3JWLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsU0FBUyx1QkFBdUI7QUFDaEMsU0FBUyxlQUFlO0FBRXhCLFNBQVMsWUFBWSxvQkFBb0I7QUFOekMsSUFBTSxtQ0FBbUM7QUFTekMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE1BQU07QUFFeEMsUUFBTSxNQUFNLFFBQVEsTUFBTSxLQUFLLFFBQVEsa0NBQVcsSUFBSSxHQUFHLEVBQUU7QUFHM0QsUUFBTSxpQkFBaUIsSUFBSSxvQkFBb0I7QUFDL0MsUUFBTSxjQUFjLElBQUksaUJBQWlCO0FBR3pDLFVBQVEsSUFBSSxJQUFJLE9BQU8sRUFBRSxDQUFDO0FBQzFCLFVBQVEsSUFBSSw4QkFB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
