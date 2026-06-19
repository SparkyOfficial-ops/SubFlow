/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_BOT_USERNAME?: string;
  readonly VITE_ROUTER_ADDRESS?: string;
  readonly VITE_TONCONNECT_MANIFEST_URL?: string;
  readonly VITE_USDT_MASTER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe?: { start_param?: string; user?: { language_code?: string } };
  ready: () => void;
  expand: () => void;
  openInvoice: (url: string, cb?: (status: string) => void) => void;
  HapticFeedback?: {
    impactOccurred: (style: "light" | "medium" | "heavy") => void;
    notificationOccurred: (type: "error" | "success" | "warning") => void;
  };
}

interface Window {
  Telegram?: { WebApp?: TelegramWebApp };
}
