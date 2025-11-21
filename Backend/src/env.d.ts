/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_POCKETBASE_URL: string;
  readonly VITE_WHATSAPP_PLUGIN_URL?: string;
  readonly VITE_WHATSAPP_API_URL?: string;
  readonly VITE_EMAIL_API_URL?: string;
  readonly VITE_WEBHOOKS_API_BASE?: string;
  readonly VITE_VAPID_PUBLIC_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
