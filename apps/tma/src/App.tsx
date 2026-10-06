import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { TabBar } from "./components/TabBar";
import { applyLanguage } from "./i18n";
import { AddSubscription } from "./screens/AddSubscription";
import { CalendarScreen } from "./screens/Calendar";
import { CreatorHub } from "./screens/CreatorHub";
import { Dashboard } from "./screens/Dashboard";
import { SubscriptionDetail } from "./screens/Detail";
import { Onboarding } from "./screens/Onboarding";
import { Profile } from "./screens/Profile";
import { SplitPay } from "./screens/SplitPay";
import { Subscriptions } from "./screens/Subscriptions";
import { useAppStore } from "./store";
import { runtime } from "./telegram";

function Screens() {
  const route = useAppStore((state) => state.route);
  const setRoute = useAppStore((state) => state.setRoute);
  const { t } = useTranslation();

  useEffect(() => {
    const param = runtime.startParam;
    if (!param) return;
    if (param.startsWith("split_")) setRoute({ name: "split" });
    if (param.startsWith("plan_")) setRoute({ name: "creator" });
  }, [setRoute]);

  if (route.name === "add") return <AddSubscription />;
  if (route.name === "detail") return <SubscriptionDetail id={route.id} />;
  if (route.name === "split") return <SplitPay subscriptionId={route.subscriptionId} />;
  if (route.name === "home") {
    return (
      <div>
        <div className="topbar">
          <h1>{t("dash.hello", { name: runtime.userName ? `, ${runtime.userName}` : "" })}</h1>
        </div>
        <Dashboard />
      </div>
    );
  }
  if (route.name === "subs") return <Subscriptions />;
  if (route.name === "calendar") return <CalendarScreen />;
  if (route.name === "creator" || route.name === "plan") return <CreatorHub />;
  return <Profile />;
}

export function App() {
  const onboarded = useAppStore((state) => state.onboarded);
  const manifest = import.meta.env.VITE_TONCONNECT_MANIFEST_URL || `${window.location.origin}/tonconnect-manifest.json`;

  useEffect(() => {
    applyLanguage(runtime.language);
  }, []);

  const route = useAppStore((state) => state.route);
  const pushed = route.name === "add" || route.name === "detail" || route.name === "split";

  return (
    <TonConnectUIProvider manifestUrl={manifest}>
      {onboarded ? (
        <div className={pushed ? "app with-action" : "app"}>
          <Screens />
          {!pushed && <TabBar />}
        </div>
      ) : (
        <Onboarding />
      )}
    </TonConnectUIProvider>
  );
}
