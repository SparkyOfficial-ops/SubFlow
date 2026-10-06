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
