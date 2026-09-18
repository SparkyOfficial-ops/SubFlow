import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActionBar, Mark, useTelegramChrome } from "../components/ui";
import { formatLong, formatMoney } from "../money";
import { PaySheet } from "./PaySheet";
import { useAppStore } from "../store";
import { haptic } from "../telegram";

export function SubscriptionDetail({ id }: { id: string }) {
  const { t, i18n } = useTranslation();
  const sub = useAppStore((state) => state.subscriptions.find((item) => item.id === id));
  const update = useAppStore((state) => state.updateSubscription);
  const remove = useAppStore((state) => state.removeSubscription);
  const setRoute = useAppStore((state) => state.setRoute);
  const [pay, setPay] = useState(false);

  const back = () => setRoute({ name: "subs" });
  useTelegramChrome(back, sub && sub.status === "active" ? { text: t("detail.renew"), onClick: () => setPay(true) } : null);

  if (!sub) {
    return (
      <div>
        <button type="button" className="text-btn" onClick={back}>←</button>
        <p className="muted">{t("subs.empty")}</p>
      </div>
    );
