// vite.config.ts
import { defineConfig, loadEnv } from "file:///E:/ecom/Merge/Backend/node_modules/vite/dist/node/index.js";
import react from "file:///E:/ecom/Merge/Backend/node_modules/@vitejs/plugin-react-swc/index.mjs";
import path from "path";
import { componentTagger } from "file:///E:/ecom/Merge/Backend/node_modules/lovable-tagger/dist/index.js";
import { VitePWA } from "file:///E:/ecom/Merge/Backend/node_modules/vite-plugin-pwa/dist/index.js";
import { existsSync, readFileSync } from "fs";
var __vite_injected_original_dirname = "E:\\ecom\\Merge\\Backend";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__vite_injected_original_dirname, ".."), "");
  const whatsAppApiUrl = env.WHATSAPP_API_URL || "https://backend-whatsappapi.7za6uc.easypanel.host";
  const emailApiUrl = env.EMAIL_API_URL || "https://backend-email.7za6uc.easypanel.host/api/email";
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
      // Make API URLs available to the app
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJFOlxcXFxlY29tXFxcXE1lcmdlXFxcXEJhY2tlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkU6XFxcXGVjb21cXFxcTWVyZ2VcXFxcQmFja2VuZFxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRTovZWNvbS9NZXJnZS9CYWNrZW5kL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBsb2FkRW52LCBVc2VyQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcclxuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0IHsgY29tcG9uZW50VGFnZ2VyIH0gZnJvbSBcImxvdmFibGUtdGFnZ2VyXCI7XHJcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tICd2aXRlLXBsdWdpbi1wd2EnO1xyXG5pbXBvcnQgdHlwZSB7IEluY29taW5nTWVzc2FnZSwgU2VydmVyUmVzcG9uc2UsIENsaWVudFJlcXVlc3QgfSBmcm9tICdodHRwJztcclxuaW1wb3J0IHsgZXhpc3RzU3luYywgcmVhZEZpbGVTeW5jIH0gZnJvbSAnZnMnO1xyXG5cclxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4ge1xyXG4gIC8vIExvYWQgZW52IHZhcmlhYmxlcyBmcm9tIHJvb3QgZGlyZWN0b3J5IChwYXJlbnQgZm9sZGVyKVxyXG4gIGNvbnN0IGVudiA9IGxvYWRFbnYobW9kZSwgcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uJyksICcnKTtcclxuXHJcbiAgLy8gR2V0IEFQSSBVUkxzIGZyb20gLmVudiBvciB1c2UgZGVmYXVsdHNcclxuICBjb25zdCB3aGF0c0FwcEFwaVVybCA9IGVudi5XSEFUU0FQUF9BUElfVVJMIHx8ICdodHRwczovL2JhY2tlbmQtd2hhdHNhcHBhcGkuN3phNnVjLmVhc3lwYW5lbC5ob3N0JztcclxuICBjb25zdCBlbWFpbEFwaVVybCA9IGVudi5FTUFJTF9BUElfVVJMIHx8ICdodHRwczovL2JhY2tlbmQtZW1haWwuN3phNnVjLmVhc3lwYW5lbC5ob3N0L2FwaS9lbWFpbCc7XHJcbiAgXHJcbiAgLy8gVHJ5IHRvIHJlYWQgcG9ydCBmcm9tIHBvcnQtaW5mby5qc29uLCBmYWxsYmFjayB0byBlbnYgb3IgZGVmYXVsdFxyXG4gIGxldCBzZXJ2ZXJQb3J0ID0gZW52LlNFUlZFUl9QT1JUIHx8ICczMDAxJztcclxuICBjb25zdCBwb3J0SW5mb1BhdGggPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAncG9ydC1pbmZvLmpzb24nKTtcclxuICBpZiAoZXhpc3RzU3luYyhwb3J0SW5mb1BhdGgpKSB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBwb3J0SW5mbyA9IEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKHBvcnRJbmZvUGF0aCwgJ3V0Zi04JykpO1xyXG4gICAgICBpZiAocG9ydEluZm8ucG9ydCkge1xyXG4gICAgICAgIHNlcnZlclBvcnQgPSBTdHJpbmcocG9ydEluZm8ucG9ydCk7XHJcbiAgICAgIH1cclxuICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgY29uc29sZS53YXJuKCdDb3VsZCBub3QgcmVhZCBwb3J0LWluZm8uanNvbiwgdXNpbmcgZGVmYXVsdCBwb3J0Jyk7XHJcbiAgICB9XHJcbiAgfVxyXG4gIC8vIE5vcm1hbGl6ZSB3ZWJob29rIHNlcnZlciBvcmlnaW47IGFjY2VwdCBmdWxsIFVSTCBvciBVUkwgd2l0aCBwYXRoLCBvdGhlcndpc2UgZmFsbGJhY2tcclxuICBjb25zdCB3ZWJob29rU2VydmVyVXJsUmF3ID0gKGVudi5XRUJIT09LX1NFUlZFUl9VUkwgfHwgJycpLnRyaW0oKTtcclxuICBsZXQgd2ViaG9va1NlcnZlck9yaWdpbiA9ICcnO1xyXG4gIGlmICh3ZWJob29rU2VydmVyVXJsUmF3KSB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCB1ID0gbmV3IFVSTCh3ZWJob29rU2VydmVyVXJsUmF3KTtcclxuICAgICAgLy8gS2VlcCBvbmx5IHRoZSBvcmlnaW4gKHByb3RvY29sICsgaG9zdFs6cG9ydF0pIHRvIHVzZSB3aXRoIHByb3h5IHRhcmdldCBhbmQgQVBJIGJhc2VcclxuICAgICAgd2ViaG9va1NlcnZlck9yaWdpbiA9IHUub3JpZ2luO1xyXG4gICAgfSBjYXRjaCB7XHJcbiAgICAgIC8vIEludmFsaWQgVVJMIHByb3ZpZGVkIChlLmcuLCAnYXBpL3dlYmhvb2tzLycpOyB3ZSdsbCBmYWxsYmFjayBiZWxvd1xyXG4gICAgICBjb25zb2xlLndhcm4oYEludmFsaWQgV0VCSE9PS19TRVJWRVJfVVJMOiAke3dlYmhvb2tTZXJ2ZXJVcmxSYXd9LiBGYWxsaW5nIGJhY2sgdG8gaHR0cDovL2xvY2FsaG9zdDoke3NlcnZlclBvcnR9YCk7XHJcbiAgICB9XHJcbiAgfVxyXG4gIGlmICghd2ViaG9va1NlcnZlck9yaWdpbikge1xyXG4gICAgd2ViaG9va1NlcnZlck9yaWdpbiA9IGBodHRwOi8vbG9jYWxob3N0OiR7c2VydmVyUG9ydH1gO1xyXG4gIH1cclxuXHJcbiAgY29uc29sZS5sb2coYFdoYXRzQXBwIEFQSSBVUkw6ICR7d2hhdHNBcHBBcGlVcmx9YCk7XHJcbiAgY29uc29sZS5sb2coYEVtYWlsIEFQSSBVUkw6ICR7ZW1haWxBcGlVcmx9YCk7XHJcbiAgY29uc29sZS5sb2coYFdlYmhvb2sgU2VydmVyIE9yaWdpbjogJHt3ZWJob29rU2VydmVyT3JpZ2lufWApO1xyXG5cclxuICAvLyBEZXRlcm1pbmUgaWYgd2UgbmVlZCBwcm94aWVzIGZvciBkZXZlbG9wbWVudCBtb2RlXHJcbiAgY29uc3QgdXNlUHJveGllcyA9IG1vZGUgPT09ICdkZXZlbG9wbWVudCc7XHJcbiAgY29uc29sZS5sb2coYFVzaW5nIHByb3hpZXMgZm9yIEFQSSBjYWxsczogJHt1c2VQcm94aWVzfWApO1xyXG5cclxuICAvLyBCYXNlIGNvbmZpZ1xyXG4gIGNvbnN0IGNvbmZpZzogVXNlckNvbmZpZyA9IHtcclxuICAgIGVudkRpcjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uJyksIC8vIFVzZSByb290IC5lbnYgZmlsZVxyXG4gICAgLy8gQWxsb3cgb3ZlcnJpZGluZyBiYXNlIHZpYSBlbnYgdmFyLiBEZWZhdWx0czpcclxuICAgIC8vIC0gcHJvZHVjdGlvbjogJy8nIChzZXJ2ZWQgb24gaXRzIG93biBvcmlnaW4pXHJcbiAgICAvLyAtIGRldmVsb3BtZW50OiAnLydcclxuICAgIGJhc2U6IGVudi5WSVRFX0NNU19CQVNFIHx8ICcvJyxcclxuICAgIHNlcnZlcjoge1xyXG4gICAgICBob3N0OiBcIjo6XCIsXHJcbiAgICAgIHBvcnQ6IDgwODAsXHJcbiAgICAgIHByb3h5OiB7fVxyXG4gICAgfSxcclxuICAgIHBsdWdpbnM6IFtcclxuICAgICAgcmVhY3QoKSxcclxuICAgICAgbW9kZSA9PT0gJ2RldmVsb3BtZW50JyAmJiBjb21wb25lbnRUYWdnZXIoKSxcclxuICAgICAgVml0ZVBXQSh7XHJcbiAgICAgICAgcmVnaXN0ZXJUeXBlOiAncHJvbXB0JyxcclxuICAgICAgICBpbmNsdWRlQXNzZXRzOiBbJ2Zhdmljb24uaWNvJywgJ2FwcGxlLXRvdWNoLWljb24ucG5nJywgJ21hc2tlZC1pY29uLnN2ZyddLFxyXG4gICAgICAgIG1hbmlmZXN0OiB7XHJcbiAgICAgICAgICBuYW1lOiAnWmVudGhyYSBTaG9wJyxcclxuICAgICAgICAgIHNob3J0X25hbWU6ICdaZW50aHJhJyxcclxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnWmVudGhyYSBTaG9wIEFkbWluJyxcclxuICAgICAgICAgIHRoZW1lX2NvbG9yOiAnI2ZmZmZmZicsXHJcbiAgICAgICAgICBiYWNrZ3JvdW5kX2NvbG9yOiAnI2ZmZmZmZicsXHJcbiAgICAgICAgICBkaXNwbGF5OiAnc3RhbmRhbG9uZScsXHJcbiAgICAgICAgICBzY29wZTogJy8nLFxyXG4gICAgICAgICAgc3RhcnRfdXJsOiAnLycsXHJcbiAgICAgICAgICBvcmllbnRhdGlvbjogJ3BvcnRyYWl0JyxcclxuICAgICAgICAgIGljb25zOiBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICBzcmM6ICdwd2EtMTkyeDE5Mi5wbmcnLFxyXG4gICAgICAgICAgICAgIHNpemVzOiAnMTkyeDE5MicsXHJcbiAgICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3BuZycsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICBzcmM6ICdwd2EtNTEyeDUxMi5wbmcnLFxyXG4gICAgICAgICAgICAgIHNpemVzOiAnNTEyeDUxMicsXHJcbiAgICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3BuZycsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICBzcmM6ICdwd2EtNTEyeDUxMi5wbmcnLFxyXG4gICAgICAgICAgICAgIHNpemVzOiAnNTEyeDUxMicsXHJcbiAgICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3BuZycsXHJcbiAgICAgICAgICAgICAgcHVycG9zZTogJ2FueSBtYXNrYWJsZScsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICBdLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pXHJcbiAgICBdLmZpbHRlcihCb29sZWFuKSxcclxuICAgIHJlc29sdmU6IHtcclxuICAgICAgYWxpYXM6IHtcclxuICAgICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgICBkZWZpbmU6IHtcclxuICAgICAgLy8gTWFrZSBBUEkgVVJMcyBhdmFpbGFibGUgdG8gdGhlIGFwcFxyXG4gICAgICAnaW1wb3J0Lm1ldGEuZW52LlZJVEVfV0hBVFNBUFBfQVBJX1VSTCc6IEpTT04uc3RyaW5naWZ5KFxyXG4gICAgICAgIHVzZVByb3hpZXMgPyAnL3doYXRzYXBwLWFwaScgOiB3aGF0c0FwcEFwaVVybFxyXG4gICAgICApLFxyXG4gICAgICAnaW1wb3J0Lm1ldGEuZW52LlZJVEVfRU1BSUxfQVBJX1VSTCc6IEpTT04uc3RyaW5naWZ5KFxyXG4gICAgICAgIHVzZVByb3hpZXMgPyAnL2VtYWlsLWFwaScgOiBlbWFpbEFwaVVybFxyXG4gICAgICApLFxyXG4gICAgICAnaW1wb3J0Lm1ldGEuZW52LlZJVEVfV0VCSE9PS1NfQVBJX0JBU0UnOiBKU09OLnN0cmluZ2lmeShcclxuICAgICAgICB1c2VQcm94aWVzID8gJy9hcGkvd2ViaG9va3MnIDogbmV3IFVSTCgnL2FwaS93ZWJob29rcycsIHdlYmhvb2tTZXJ2ZXJPcmlnaW4pLnRvU3RyaW5nKClcclxuICAgICAgKSxcclxuICAgICAgJ2ltcG9ydC5tZXRhLmVudi5WSVRFX1ZBUElEX1BVQkxJQ19LRVknOiBKU09OLnN0cmluZ2lmeShlbnYuVklURV9WQVBJRF9QVUJMSUNfS0VZKSxcclxuICAgIH1cclxuICB9O1xyXG5cclxuICAvLyBBZGQgcHJveGllcyBvbmx5IGZvciBkZXZlbG9wbWVudCBtb2RlXHJcbiAgaWYgKHVzZVByb3hpZXMgJiYgY29uZmlnLnNlcnZlcj8ucHJveHkpIHtcclxuICAgIGNvbmZpZy5zZXJ2ZXIucHJveHkgPSB7XHJcbiAgICAgICcvYXBpL3dlYmhvb2tzJzoge1xyXG4gICAgICAgIHRhcmdldDogd2ViaG9va1NlcnZlck9yaWdpbixcclxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXHJcbiAgICAgICAgc2VjdXJlOiBmYWxzZSxcclxuICAgICAgICBjb25maWd1cmU6IChwcm94eSkgPT4ge1xyXG4gICAgICAgICAgcHJveHkub24oJ2Vycm9yJywgKGVycjogRXJyb3IpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1dlYmhvb2sgcHJveHkgZXJyb3I6JywgZXJyKTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgcHJveHkub24oJ3Byb3h5UmVxJywgKHByb3h5UmVxOiBDbGllbnRSZXF1ZXN0LCByZXE6IEluY29taW5nTWVzc2FnZSkgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnU2VuZGluZyBXZWJob29rIFJlcXVlc3Q6JywgcmVxLm1ldGhvZCwgcmVxLnVybCk7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICAgIHByb3h5Lm9uKCdwcm94eVJlcycsIChwcm94eVJlczogSW5jb21pbmdNZXNzYWdlLCByZXE6IEluY29taW5nTWVzc2FnZSkgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnUmVjZWl2ZWQgV2ViaG9vayBSZXNwb25zZTonLCBwcm94eVJlcy5zdGF0dXNDb2RlLCByZXEudXJsKTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuICAgICAgJy93aGF0c2FwcC1hcGknOiB7XHJcbiAgICAgICAgdGFyZ2V0OiB3aGF0c0FwcEFwaVVybCxcclxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXHJcbiAgICAgICAgcmV3cml0ZTogKHBhdGg6IHN0cmluZykgPT4gcGF0aC5yZXBsYWNlKC9eXFwvd2hhdHNhcHAtYXBpLywgJycpLFxyXG4gICAgICAgIHNlY3VyZTogZmFsc2UsXHJcbiAgICAgICAgY29uZmlndXJlOiAocHJveHkpID0+IHtcclxuICAgICAgICAgIHByb3h5Lm9uKCdwcm94eVJlcycsIChwcm94eVJlczogSW5jb21pbmdNZXNzYWdlLCByZXE6IEluY29taW5nTWVzc2FnZSwgcmVzOiBTZXJ2ZXJSZXNwb25zZSkgPT4ge1xyXG4gICAgICAgICAgICBpZiAocmVzLnNldEhlYWRlcikge1xyXG4gICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbicsICcqJyk7XHJcbiAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcycsICdHRVQsUFVULFBPU1QsREVMRVRFLE9QVElPTlMnKTtcclxuICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJywgJ0NvbnRlbnQtVHlwZSwgQXV0aG9yaXphdGlvbicpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICAgIHByb3h5Lm9uKCdlcnJvcicsIChlcnI6IEVycm9yKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdXaGF0c0FwcCBwcm94eSBlcnJvcjonLCBlcnIpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgICBwcm94eS5vbigncHJveHlSZXEnLCAocHJveHlSZXE6IENsaWVudFJlcXVlc3QsIHJlcTogSW5jb21pbmdNZXNzYWdlKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTZW5kaW5nIFdoYXRzQXBwIFJlcXVlc3Q6JywgcmVxLm1ldGhvZCwgcmVxLnVybCk7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICAgIHByb3h5Lm9uKCdwcm94eVJlcycsIChwcm94eVJlczogSW5jb21pbmdNZXNzYWdlLCByZXE6IEluY29taW5nTWVzc2FnZSkgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnUmVjZWl2ZWQgV2hhdHNBcHAgUmVzcG9uc2U6JywgcHJveHlSZXMuc3RhdHVzQ29kZSwgcmVxLnVybCk7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgICcvZW1haWwtYXBpJzoge1xyXG4gICAgICAgIHRhcmdldDogZW1haWxBcGlVcmwsXHJcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxyXG4gICAgICAgIHJld3JpdGU6IChwYXRoOiBzdHJpbmcpID0+IHBhdGgucmVwbGFjZSgvXlxcL2VtYWlsLWFwaS8sICcnKSxcclxuICAgICAgICBzZWN1cmU6IGZhbHNlLFxyXG4gICAgICAgIGNvbmZpZ3VyZTogKHByb3h5KSA9PiB7XHJcbiAgICAgICAgICBwcm94eS5vbignZXJyb3InLCAoZXJyOiBFcnJvcikgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnRW1haWwgcHJveHkgZXJyb3I6JywgZXJyKTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgcHJveHkub24oJ3Byb3h5UmVxJywgKHByb3h5UmVxOiBDbGllbnRSZXF1ZXN0LCByZXE6IEluY29taW5nTWVzc2FnZSkgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnU2VuZGluZyBFbWFpbCBSZXF1ZXN0OicsIHJlcS5tZXRob2QsIHJlcS51cmwpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgICBwcm94eS5vbigncHJveHlSZXMnLCAocHJveHlSZXM6IEluY29taW5nTWVzc2FnZSwgcmVxOiBJbmNvbWluZ01lc3NhZ2UpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1JlY2VpdmVkIEVtYWlsIFJlc3BvbnNlOicsIHByb3h5UmVzLnN0YXR1c0NvZGUsIHJlcS51cmwpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIHJldHVybiBjb25maWc7XHJcbn0pO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXlQLFNBQVMsY0FBYyxlQUEyQjtBQUMzUyxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsdUJBQXVCO0FBQ2hDLFNBQVMsZUFBZTtBQUV4QixTQUFTLFlBQVksb0JBQW9CO0FBTnpDLElBQU0sbUNBQW1DO0FBU3pDLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxNQUFNO0FBRXhDLFFB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
