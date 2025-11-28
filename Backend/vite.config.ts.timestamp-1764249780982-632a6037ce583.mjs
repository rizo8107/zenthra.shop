// vite.config.ts
import { defineConfig, loadEnv } from "file:///D:/Nirmal/Zenthra/shop%20v2/zenthra.shop/Backend/node_modules/vite/dist/node/index.js";
import react from "file:///D:/Nirmal/Zenthra/shop%20v2/zenthra.shop/Backend/node_modules/@vitejs/plugin-react-swc/index.mjs";
import path from "path";
import { componentTagger } from "file:///D:/Nirmal/Zenthra/shop%20v2/zenthra.shop/Backend/node_modules/lovable-tagger/dist/index.js";
import { VitePWA } from "file:///D:/Nirmal/Zenthra/shop%20v2/zenthra.shop/Backend/node_modules/vite-plugin-pwa/dist/index.js";
import { existsSync, readFileSync } from "fs";
var __vite_injected_original_dirname = "D:\\Nirmal\\Zenthra\\shop v2\\zenthra.shop\\Backend";
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxOaXJtYWxcXFxcWmVudGhyYVxcXFxzaG9wIHYyXFxcXHplbnRocmEuc2hvcFxcXFxCYWNrZW5kXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxOaXJtYWxcXFxcWmVudGhyYVxcXFxzaG9wIHYyXFxcXHplbnRocmEuc2hvcFxcXFxCYWNrZW5kXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi9OaXJtYWwvWmVudGhyYS9zaG9wJTIwdjIvemVudGhyYS5zaG9wL0JhY2tlbmQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcsIGxvYWRFbnYsIFVzZXJDb25maWcgfSBmcm9tIFwidml0ZVwiO1xyXG5pbXBvcnQgcmVhY3QgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXJlYWN0LXN3Y1wiO1xyXG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xyXG5pbXBvcnQgeyBjb21wb25lbnRUYWdnZXIgfSBmcm9tIFwibG92YWJsZS10YWdnZXJcIjtcclxuaW1wb3J0IHsgVml0ZVBXQSB9IGZyb20gJ3ZpdGUtcGx1Z2luLXB3YSc7XHJcbmltcG9ydCB0eXBlIHsgSW5jb21pbmdNZXNzYWdlLCBTZXJ2ZXJSZXNwb25zZSwgQ2xpZW50UmVxdWVzdCB9IGZyb20gJ2h0dHAnO1xyXG5pbXBvcnQgeyBleGlzdHNTeW5jLCByZWFkRmlsZVN5bmMgfSBmcm9tICdmcyc7XHJcblxyXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiB7XHJcbiAgLy8gTG9hZCBlbnYgdmFyaWFibGVzIGZyb20gcm9vdCBkaXJlY3RvcnkgKHBhcmVudCBmb2xkZXIpXHJcbiAgY29uc3QgZW52ID0gbG9hZEVudihtb2RlLCBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4nKSwgJycpO1xyXG5cclxuICAvLyBHZXQgQVBJIFVSTHMgZnJvbSAuZW52IG9yIHVzZSBkZWZhdWx0c1xyXG4gIGNvbnN0IHdoYXRzQXBwQXBpVXJsID0gZW52LldIQVRTQVBQX0FQSV9VUkwgfHwgJ2h0dHBzOi8vYmFja2VuZC13aGF0c2FwcGFwaS43emE2dWMuZWFzeXBhbmVsLmhvc3QnO1xyXG4gIGNvbnN0IGVtYWlsQXBpVXJsID0gZW52LkVNQUlMX0FQSV9VUkwgfHwgJ2h0dHBzOi8vYmFja2VuZC1lbWFpbC43emE2dWMuZWFzeXBhbmVsLmhvc3QvYXBpL2VtYWlsJztcclxuICBcclxuICAvLyBMb2cgUG9ja2V0QmFzZSBVUkwgZnJvbSBlbnZcclxuICBjb25zb2xlLmxvZygnPScucmVwZWF0KDYwKSk7XHJcbiAgY29uc29sZS5sb2coJ0Vudmlyb25tZW50IFZhcmlhYmxlcyBDaGVjazonKTtcclxuICBjb25zb2xlLmxvZygnVklURV9QT0NLRVRCQVNFX1VSTCBmcm9tIGVudjonLCBlbnYuVklURV9QT0NLRVRCQVNFX1VSTCk7XHJcbiAgY29uc29sZS5sb2coJ0FsbCBWSVRFXyB2YXJpYWJsZXM6JywgT2JqZWN0LmtleXMoZW52KS5maWx0ZXIoayA9PiBrLnN0YXJ0c1dpdGgoJ1ZJVEVfJykpKTtcclxuICBjb25zb2xlLmxvZygnZW52RGlyOicsIHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLicpKTtcclxuICBjb25zb2xlLmxvZygnPScucmVwZWF0KDYwKSk7XHJcbiAgaWYgKCFlbnYuVklURV9QT0NLRVRCQVNFX1VSTCkge1xyXG4gICAgY29uc29sZS5lcnJvcignXHUyNkEwXHVGRTBGICBXQVJOSU5HOiBWSVRFX1BPQ0tFVEJBU0VfVVJMIGlzIG5vdCBzZXQgaW4gLmVudiBmaWxlIScpO1xyXG4gICAgY29uc29sZS5lcnJvcignXHUyNkEwXHVGRTBGICBQbGVhc2UgZW5zdXJlIHRoZSAuZW52IGZpbGUgYXQgdGhlIHJvb3QgaGFzOiBWSVRFX1BPQ0tFVEJBU0VfVVJMPWh0dHBzOi8veW91ci1iYWNrZW5kLXVybCcpO1xyXG4gIH1cclxuICBcclxuICAvLyBUcnkgdG8gcmVhZCBwb3J0IGZyb20gcG9ydC1pbmZvLmpzb24sIGZhbGxiYWNrIHRvIGVudiBvciBkZWZhdWx0XHJcbiAgbGV0IHNlcnZlclBvcnQgPSBlbnYuU0VSVkVSX1BPUlQgfHwgJzMwMDEnO1xyXG4gIGNvbnN0IHBvcnRJbmZvUGF0aCA9IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdwb3J0LWluZm8uanNvbicpO1xyXG4gIGlmIChleGlzdHNTeW5jKHBvcnRJbmZvUGF0aCkpIHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHBvcnRJbmZvID0gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMocG9ydEluZm9QYXRoLCAndXRmLTgnKSk7XHJcbiAgICAgIGlmIChwb3J0SW5mby5wb3J0KSB7XHJcbiAgICAgICAgc2VydmVyUG9ydCA9IFN0cmluZyhwb3J0SW5mby5wb3J0KTtcclxuICAgICAgfVxyXG4gICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICBjb25zb2xlLndhcm4oJ0NvdWxkIG5vdCByZWFkIHBvcnQtaW5mby5qc29uLCB1c2luZyBkZWZhdWx0IHBvcnQnKTtcclxuICAgIH1cclxuICB9XHJcbiAgLy8gTm9ybWFsaXplIHdlYmhvb2sgc2VydmVyIG9yaWdpbjsgYWNjZXB0IGZ1bGwgVVJMIG9yIFVSTCB3aXRoIHBhdGgsIG90aGVyd2lzZSBmYWxsYmFja1xyXG4gIGNvbnN0IHdlYmhvb2tTZXJ2ZXJVcmxSYXcgPSAoZW52LldFQkhPT0tfU0VSVkVSX1VSTCB8fCAnJykudHJpbSgpO1xyXG4gIGxldCB3ZWJob29rU2VydmVyT3JpZ2luID0gJyc7XHJcbiAgaWYgKHdlYmhvb2tTZXJ2ZXJVcmxSYXcpIHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHUgPSBuZXcgVVJMKHdlYmhvb2tTZXJ2ZXJVcmxSYXcpO1xyXG4gICAgICAvLyBLZWVwIG9ubHkgdGhlIG9yaWdpbiAocHJvdG9jb2wgKyBob3N0Wzpwb3J0XSkgdG8gdXNlIHdpdGggcHJveHkgdGFyZ2V0IGFuZCBBUEkgYmFzZVxyXG4gICAgICB3ZWJob29rU2VydmVyT3JpZ2luID0gdS5vcmlnaW47XHJcbiAgICB9IGNhdGNoIHtcclxuICAgICAgLy8gSW52YWxpZCBVUkwgcHJvdmlkZWQgKGUuZy4sICdhcGkvd2ViaG9va3MvJyk7IHdlJ2xsIGZhbGxiYWNrIGJlbG93XHJcbiAgICAgIGNvbnNvbGUud2FybihgSW52YWxpZCBXRUJIT09LX1NFUlZFUl9VUkw6ICR7d2ViaG9va1NlcnZlclVybFJhd30uIEZhbGxpbmcgYmFjayB0byBodHRwOi8vbG9jYWxob3N0OiR7c2VydmVyUG9ydH1gKTtcclxuICAgIH1cclxuICB9XHJcbiAgaWYgKCF3ZWJob29rU2VydmVyT3JpZ2luKSB7XHJcbiAgICB3ZWJob29rU2VydmVyT3JpZ2luID0gYGh0dHA6Ly9sb2NhbGhvc3Q6JHtzZXJ2ZXJQb3J0fWA7XHJcbiAgfVxyXG5cclxuICBjb25zb2xlLmxvZyhgV2hhdHNBcHAgQVBJIFVSTDogJHt3aGF0c0FwcEFwaVVybH1gKTtcclxuICBjb25zb2xlLmxvZyhgRW1haWwgQVBJIFVSTDogJHtlbWFpbEFwaVVybH1gKTtcclxuICBjb25zb2xlLmxvZyhgV2ViaG9vayBTZXJ2ZXIgT3JpZ2luOiAke3dlYmhvb2tTZXJ2ZXJPcmlnaW59YCk7XHJcblxyXG4gIC8vIERldGVybWluZSBpZiB3ZSBuZWVkIHByb3hpZXMgZm9yIGRldmVsb3BtZW50IG1vZGVcclxuICBjb25zdCB1c2VQcm94aWVzID0gbW9kZSA9PT0gJ2RldmVsb3BtZW50JztcclxuICBjb25zb2xlLmxvZyhgVXNpbmcgcHJveGllcyBmb3IgQVBJIGNhbGxzOiAke3VzZVByb3hpZXN9YCk7XHJcblxyXG4gIC8vIEJhc2UgY29uZmlnXHJcbiAgY29uc3QgY29uZmlnOiBVc2VyQ29uZmlnID0ge1xyXG4gICAgZW52RGlyOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4nKSwgLy8gVXNlIHJvb3QgLmVudiBmaWxlXHJcbiAgICBlbnZQcmVmaXg6IFsnVklURV8nXSwgLy8gRXhwb3NlIGFsbCBWSVRFXyBwcmVmaXhlZCB2YXJpYWJsZXMgdG8gdGhlIGNsaWVudFxyXG4gICAgLy8gQWxsb3cgb3ZlcnJpZGluZyBiYXNlIHZpYSBlbnYgdmFyLiBEZWZhdWx0czpcclxuICAgIC8vIC0gcHJvZHVjdGlvbjogJy8nIChzZXJ2ZWQgb24gaXRzIG93biBvcmlnaW4pXHJcbiAgICAvLyAtIGRldmVsb3BtZW50OiAnLydcclxuICAgIGJhc2U6IGVudi5WSVRFX0NNU19CQVNFIHx8ICcvJyxcclxuICAgIHNlcnZlcjoge1xyXG4gICAgICBob3N0OiBcIjo6XCIsXHJcbiAgICAgIHBvcnQ6IDgwODAsXHJcbiAgICAgIHByb3h5OiB7fVxyXG4gICAgfSxcclxuICAgIHBsdWdpbnM6IFtcclxuICAgICAgcmVhY3QoKSxcclxuICAgICAgbW9kZSA9PT0gJ2RldmVsb3BtZW50JyAmJiBjb21wb25lbnRUYWdnZXIoKSxcclxuICAgICAgVml0ZVBXQSh7XHJcbiAgICAgICAgcmVnaXN0ZXJUeXBlOiAncHJvbXB0JyxcclxuICAgICAgICBpbmNsdWRlQXNzZXRzOiBbJ2Zhdmljb24uaWNvJywgJ2FwcGxlLXRvdWNoLWljb24ucG5nJywgJ21hc2tlZC1pY29uLnN2ZyddLFxyXG4gICAgICAgIHdvcmtib3g6IHtcclxuICAgICAgICAgIG1heGltdW1GaWxlU2l6ZVRvQ2FjaGVJbkJ5dGVzOiAzICogMTAyNCAqIDEwMjQsIC8vIDMgTUJcclxuICAgICAgICB9LFxyXG4gICAgICAgIG1hbmlmZXN0OiB7XHJcbiAgICAgICAgICBuYW1lOiAnWmVudGhyYSBTaG9wJyxcclxuICAgICAgICAgIHNob3J0X25hbWU6ICdaZW50aHJhJyxcclxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnWmVudGhyYSBTaG9wIEFkbWluJyxcclxuICAgICAgICAgIHRoZW1lX2NvbG9yOiAnI2ZmZmZmZicsXHJcbiAgICAgICAgICBiYWNrZ3JvdW5kX2NvbG9yOiAnI2ZmZmZmZicsXHJcbiAgICAgICAgICBkaXNwbGF5OiAnc3RhbmRhbG9uZScsXHJcbiAgICAgICAgICBzY29wZTogJy8nLFxyXG4gICAgICAgICAgc3RhcnRfdXJsOiAnLycsXHJcbiAgICAgICAgICBvcmllbnRhdGlvbjogJ3BvcnRyYWl0JyxcclxuICAgICAgICAgIGljb25zOiBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICBzcmM6ICdwd2EtMTkyeDE5Mi5wbmcnLFxyXG4gICAgICAgICAgICAgIHNpemVzOiAnMTkyeDE5MicsXHJcbiAgICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3BuZycsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICBzcmM6ICdwd2EtNTEyeDUxMi5wbmcnLFxyXG4gICAgICAgICAgICAgIHNpemVzOiAnNTEyeDUxMicsXHJcbiAgICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3BuZycsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICBzcmM6ICdwd2EtNTEyeDUxMi5wbmcnLFxyXG4gICAgICAgICAgICAgIHNpemVzOiAnNTEyeDUxMicsXHJcbiAgICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3BuZycsXHJcbiAgICAgICAgICAgICAgcHVycG9zZTogJ2FueSBtYXNrYWJsZScsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICBdLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pXHJcbiAgICBdLmZpbHRlcihCb29sZWFuKSxcclxuICAgIHJlc29sdmU6IHtcclxuICAgICAgYWxpYXM6IHtcclxuICAgICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgICBkZWZpbmU6IHtcclxuICAgICAgLy8gTWFrZSBBUEkgVVJMcyBhdmFpbGFibGUgdG8gdGhlIGFwcCAoVklURV9QT0NLRVRCQVNFX1VSTCBpcyBhdXRvLWV4cG9zZWQgdmlhIGVudlByZWZpeClcclxuICAgICAgJ2ltcG9ydC5tZXRhLmVudi5WSVRFX1dIQVRTQVBQX0FQSV9VUkwnOiBKU09OLnN0cmluZ2lmeShcclxuICAgICAgICB1c2VQcm94aWVzID8gJy93aGF0c2FwcC1hcGknIDogd2hhdHNBcHBBcGlVcmxcclxuICAgICAgKSxcclxuICAgICAgJ2ltcG9ydC5tZXRhLmVudi5WSVRFX0VNQUlMX0FQSV9VUkwnOiBKU09OLnN0cmluZ2lmeShcclxuICAgICAgICB1c2VQcm94aWVzID8gJy9lbWFpbC1hcGknIDogZW1haWxBcGlVcmxcclxuICAgICAgKSxcclxuICAgICAgJ2ltcG9ydC5tZXRhLmVudi5WSVRFX1dFQkhPT0tTX0FQSV9CQVNFJzogSlNPTi5zdHJpbmdpZnkoXHJcbiAgICAgICAgdXNlUHJveGllcyA/ICcvYXBpL3dlYmhvb2tzJyA6IG5ldyBVUkwoJy9hcGkvd2ViaG9va3MnLCB3ZWJob29rU2VydmVyT3JpZ2luKS50b1N0cmluZygpXHJcbiAgICAgICksXHJcbiAgICAgICdpbXBvcnQubWV0YS5lbnYuVklURV9WQVBJRF9QVUJMSUNfS0VZJzogSlNPTi5zdHJpbmdpZnkoZW52LlZJVEVfVkFQSURfUFVCTElDX0tFWSksXHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgLy8gQWRkIHByb3hpZXMgb25seSBmb3IgZGV2ZWxvcG1lbnQgbW9kZVxyXG4gIGlmICh1c2VQcm94aWVzICYmIGNvbmZpZy5zZXJ2ZXI/LnByb3h5KSB7XHJcbiAgICBjb25maWcuc2VydmVyLnByb3h5ID0ge1xyXG4gICAgICAnL2FwaS93ZWJob29rcyc6IHtcclxuICAgICAgICB0YXJnZXQ6IHdlYmhvb2tTZXJ2ZXJPcmlnaW4sXHJcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxyXG4gICAgICAgIHNlY3VyZTogZmFsc2UsXHJcbiAgICAgICAgY29uZmlndXJlOiAocHJveHkpID0+IHtcclxuICAgICAgICAgIHByb3h5Lm9uKCdlcnJvcicsIChlcnI6IEVycm9yKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdXZWJob29rIHByb3h5IGVycm9yOicsIGVycik7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICAgIHByb3h5Lm9uKCdwcm94eVJlcScsIChwcm94eVJlcTogQ2xpZW50UmVxdWVzdCwgcmVxOiBJbmNvbWluZ01lc3NhZ2UpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1NlbmRpbmcgV2ViaG9vayBSZXF1ZXN0OicsIHJlcS5tZXRob2QsIHJlcS51cmwpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgICBwcm94eS5vbigncHJveHlSZXMnLCAocHJveHlSZXM6IEluY29taW5nTWVzc2FnZSwgcmVxOiBJbmNvbWluZ01lc3NhZ2UpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1JlY2VpdmVkIFdlYmhvb2sgUmVzcG9uc2U6JywgcHJveHlSZXMuc3RhdHVzQ29kZSwgcmVxLnVybCk7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgICcvYXBpL2N1c3RvbWVyLWpvdXJuZXknOiB7XHJcbiAgICAgICAgdGFyZ2V0OiB3ZWJob29rU2VydmVyT3JpZ2luLFxyXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgICBzZWN1cmU6IGZhbHNlLFxyXG4gICAgICAgIGNvbmZpZ3VyZTogKHByb3h5KSA9PiB7XHJcbiAgICAgICAgICBwcm94eS5vbignZXJyb3InLCAoZXJyOiBFcnJvcikgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnQ3VzdG9tZXJKb3VybmV5IHByb3h5IGVycm9yOicsIGVycik7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICAgIHByb3h5Lm9uKCdwcm94eVJlcScsIChwcm94eVJlcTogQ2xpZW50UmVxdWVzdCwgcmVxOiBJbmNvbWluZ01lc3NhZ2UpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1NlbmRpbmcgSm91cm5leSBSZXF1ZXN0OicsIHJlcS5tZXRob2QsIHJlcS51cmwpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgICBwcm94eS5vbigncHJveHlSZXMnLCAocHJveHlSZXM6IEluY29taW5nTWVzc2FnZSwgcmVxOiBJbmNvbWluZ01lc3NhZ2UpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1JlY2VpdmVkIEpvdXJuZXkgUmVzcG9uc2U6JywgcHJveHlSZXMuc3RhdHVzQ29kZSwgcmVxLnVybCk7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgICcvd2hhdHNhcHAtYXBpJzoge1xyXG4gICAgICAgIHRhcmdldDogd2hhdHNBcHBBcGlVcmwsXHJcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxyXG4gICAgICAgIHJld3JpdGU6IChwYXRoOiBzdHJpbmcpID0+IHBhdGgucmVwbGFjZSgvXlxcL3doYXRzYXBwLWFwaS8sICcnKSxcclxuICAgICAgICBzZWN1cmU6IGZhbHNlLFxyXG4gICAgICAgIGNvbmZpZ3VyZTogKHByb3h5KSA9PiB7XHJcbiAgICAgICAgICBwcm94eS5vbigncHJveHlSZXMnLCAocHJveHlSZXM6IEluY29taW5nTWVzc2FnZSwgcmVxOiBJbmNvbWluZ01lc3NhZ2UsIHJlczogU2VydmVyUmVzcG9uc2UpID0+IHtcclxuICAgICAgICAgICAgaWYgKHJlcy5zZXRIZWFkZXIpIHtcclxuICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nLCAnKicpO1xyXG4gICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnLCAnR0VULFBVVCxQT1NULERFTEVURSxPUFRJT05TJyk7XHJcbiAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycycsICdDb250ZW50LVR5cGUsIEF1dGhvcml6YXRpb24nKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgICBwcm94eS5vbignZXJyb3InLCAoZXJyOiBFcnJvcikgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnV2hhdHNBcHAgcHJveHkgZXJyb3I6JywgZXJyKTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgcHJveHkub24oJ3Byb3h5UmVxJywgKHByb3h5UmVxOiBDbGllbnRSZXF1ZXN0LCByZXE6IEluY29taW5nTWVzc2FnZSkgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnU2VuZGluZyBXaGF0c0FwcCBSZXF1ZXN0OicsIHJlcS5tZXRob2QsIHJlcS51cmwpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgICBwcm94eS5vbigncHJveHlSZXMnLCAocHJveHlSZXM6IEluY29taW5nTWVzc2FnZSwgcmVxOiBJbmNvbWluZ01lc3NhZ2UpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1JlY2VpdmVkIFdoYXRzQXBwIFJlc3BvbnNlOicsIHByb3h5UmVzLnN0YXR1c0NvZGUsIHJlcS51cmwpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG4gICAgICAnL2VtYWlsLWFwaSc6IHtcclxuICAgICAgICB0YXJnZXQ6IGVtYWlsQXBpVXJsLFxyXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgICByZXdyaXRlOiAocGF0aDogc3RyaW5nKSA9PiBwYXRoLnJlcGxhY2UoL15cXC9lbWFpbC1hcGkvLCAnJyksXHJcbiAgICAgICAgc2VjdXJlOiBmYWxzZSxcclxuICAgICAgICBjb25maWd1cmU6IChwcm94eSkgPT4ge1xyXG4gICAgICAgICAgcHJveHkub24oJ2Vycm9yJywgKGVycjogRXJyb3IpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ0VtYWlsIHByb3h5IGVycm9yOicsIGVycik7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICAgIHByb3h5Lm9uKCdwcm94eVJlcScsIChwcm94eVJlcTogQ2xpZW50UmVxdWVzdCwgcmVxOiBJbmNvbWluZ01lc3NhZ2UpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1NlbmRpbmcgRW1haWwgUmVxdWVzdDonLCByZXEubWV0aG9kLCByZXEudXJsKTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgcHJveHkub24oJ3Byb3h5UmVzJywgKHByb3h5UmVzOiBJbmNvbWluZ01lc3NhZ2UsIHJlcTogSW5jb21pbmdNZXNzYWdlKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdSZWNlaXZlZCBFbWFpbCBSZXNwb25zZTonLCBwcm94eVJlcy5zdGF0dXNDb2RlLCByZXEudXJsKTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICByZXR1cm4gY29uZmlnO1xyXG59KTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUEwVSxTQUFTLGNBQWMsZUFBMkI7QUFDNVgsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUNqQixTQUFTLHVCQUF1QjtBQUNoQyxTQUFTLGVBQWU7QUFFeEIsU0FBUyxZQUFZLG9CQUFvQjtBQU56QyxJQUFNLG1DQUFtQztBQVN6QyxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssTUFBTTtBQUV4QyxRQUFNLE1BQU0sUUFBUSxNQUFNLEtBQUssUUFBUSxrQ0FBVyxJQUFJLEdBQUcsRUFBRTtBQUczRCxRQUFNLGlCQUFpQixJQUFJLG9CQUFvQjtBQUMvQyxRQUFNLGNBQWMsSUFBSSxpQkFBaUI7QUFHekMsVUFB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
