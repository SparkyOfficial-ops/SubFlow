export const runtime = {
  inTelegram: false,
  startParam: readStartParam(),
  language: undefined as string | undefined,
  initDataRaw: "",
  userName: undefined as string | undefined,
};

function readStartParam(): string | undefined {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  return hash.get("tgWebAppStartParam") || query.get("tgWebAppStartParam") || window.Telegram?.WebApp?.initDataUnsafe?.start_param || undefined;
}

export async function bootstrapTelegram(): Promise<void> {
  const webApp = window.Telegram?.WebApp;
  runtime.initDataRaw = webApp?.initData ?? "";
  runtime.inTelegram = Boolean(runtime.initDataRaw);
  runtime.language = webApp?.initDataUnsafe?.user?.language_code;
  runtime.startParam = readStartParam();

  if (!runtime.inTelegram) {
    const saved = localStorage.getItem("subflow-lang");
    runtime.language = saved || navigator.language;
    return;
  }

  try {
    const sdk = await import("@telegram-apps/sdk-react");
    sdk.init();
