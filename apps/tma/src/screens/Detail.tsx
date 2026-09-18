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
  }

  return (
    <div>
      <div className="topbar">
        <button type="button" className="icon-btn" onClick={back}>←</button>
        <h1>{sub.name}</h1>
      </div>
      <div className="hero">
        <Mark color={sub.color} label={sub.emoji} />
        <h2 className="hero-sum" style={{ fontSize: 32, marginTop: 12 }}>{formatMoney(sub.amount, sub.currency)}</h2>
        <p className="hero-sub">{t(`periods.${sub.period}`)} · {t(`categories.${sub.category}`)}</p>
      </div>
      <div className="section">
        <div className="spread"><span className="muted">{t("detail.next")}</span><span>{formatLong(sub.nextChargeAt, i18n.language)}</span></div>
        <div className="spread" style={{ marginTop: 8 }}><span className="muted">{t("detail.method")}</span><span>{t(`methods.${sub.paymentMethod}`)}</span></div>
        {sub.note && <p className="notice">{sub.note}</p>}
        {sub.isTrial && sub.trialEndsAt && <p className="notice">{t("detail.trialUntil", { date: formatLong(sub.trialEndsAt, i18n.language) })}</p>}
      </div>
      <div className="stack" style={{ marginTop: 18 }}>
        {sub.status === "active" && (
          <button type="button" className="ghost" onClick={() => { update(sub.id, { status: "paused" }); void haptic("tap"); }}>
