/// <reference types="vite/client" />

// Extend ImportMeta for server builds that import client code
interface ImportMeta {
  env: ImportMetaEnv;
}

interface ImportMetaEnv {
  readonly VITE_POCKETBASE_URL: string;
  readonly VITE_BACKEND_URL: string;
  readonly VITE_POCKETBASE_ADMIN_EMAIL: string;
  readonly VITE_POCKETBASE_ADMIN_PASSWORD: string;
  // Add other VITE_ vars as needed
  [key: string]: any;
}
