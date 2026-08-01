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
    if (sdk.themeParams.mount.isAvailable()) {
      sdk.themeParams.mount();
      sdk.themeParams.bindCssVars();
    }
    if (sdk.miniApp.mount.isAvailable()) {
      sdk.miniApp.mount();
      sdk.miniApp.bindCssVars();
    }
    if (sdk.viewport.mount.isAvailable()) {
      await sdk.viewport.mount();
      if (sdk.viewport.expand.isAvailable()) sdk.viewport.expand();
      if (sdk.viewport.bindCssVars.isAvailable()) sdk.viewport.bindCssVars();
    }
    if (sdk.backButton.mount.isAvailable()) sdk.backButton.mount();
    if (sdk.mainButton.mount.isAvailable()) sdk.mainButton.mount();
    if (sdk.miniApp.ready.isAvailable()) sdk.miniApp.ready();
    const user = sdk.initData.user();
    runtime.userName = user?.first_name;
    runtime.language = user?.language_code ?? runtime.language;
  } catch (error) {
    console.warn("Telegram SDK init failed", error);
    webApp?.ready();
    webApp?.expand();
  }
}

export async function haptic(kind: "tap" | "success" | "error"): Promise<void> {
  const fallback = window.Telegram?.WebApp?.HapticFeedback;
  try {
    if (!runtime.inTelegram) return;
    const { hapticFeedback } = await import("@telegram-apps/sdk-react");
    if (kind === "tap" && hapticFeedback.impactOccurred.isAvailable()) hapticFeedback.impactOccurred("light");
    if (kind === "success" && hapticFeedback.notificationOccurred.isAvailable()) hapticFeedback.notificationOccurred("success");
    if (kind === "error" && hapticFeedback.notificationOccurred.isAvailable()) hapticFeedback.notificationOccurred("error");
  } catch {
    if (kind === "tap") fallback?.impactOccurred("light");
    if (kind === "success") fallback?.notificationOccurred("success");
    if (kind === "error") fallback?.notificationOccurred("error");
  }
}
