import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Placeholder } from "@telegram-apps/telegram-ui";
import { Mark } from "../components/ui";
import { categoryTotals, eventsBetween, formatDay, formatMoney, inDisplay, monthSpend, yearForecast } from "../money";
import { useAppStore } from "../store";
import { CATEGORY_COLOR } from "../templates";
import { haptic } from "../telegram";

export function Dashboard() {
  const { t, i18n } = useTranslation();
  const subs = useAppStore((state) => state.subscriptions);
  const currency = useAppStore((state) => state.displayCurrency);
  const wallet = useAppStore((state) => state.walletAddress);
  const setRoute = useAppStore((state) => state.setRoute);
  const loadDemo = useAppStore((state) => state.loadDemo);

  const month = monthSpend(subs, currency);
  const year = yearForecast(subs, currency);
  const upcoming = useMemo(() => {
    const end = new Date();
    end.setDate(end.getDate() + 45);
    return eventsBetween(subs, new Date(), end).filter((event) => event.kind === "charge").slice(0, 5);
  }, [subs]);
  const cats = categoryTotals(subs, currency);
  const max = cats[0]?.[1] || 1;
  const trials = subs.filter((sub) => sub.isTrial && sub.trialEndsAt && sub.status === "active");

  if (!subs.length) {
    return (
      <Placeholder header={t("dash.emptyTitle")} description={t("dash.emptyText")}>
        <div className="stack" style={{ width: "100%" }}>
          <button type="button" className="primary" onClick={() => setRoute({ name: "add" })}>
            {t("dash.add")}
          </button>
          <button type="button" className="ghost" onClick={() => { void haptic("tap"); loadDemo(); }}>
            {t("dash.demo")}
          </button>
        </div>
      </Placeholder>
    );
  }

  return (
    <div>
      <div className="hero">
        <p className="eyebrow">{t("dash.month")}</p>
        <h1 className="hero-sum">{formatMoney(month, currency)}</h1>
        <p className="hero-sub">
          {t("dash.year")}: {formatMoney(year, currency)}
        </p>
        <button type="button" className="wallet-chip" onClick={() => setRoute({ name: "profile" })}>
          {wallet ? `${wallet.slice(0, 4)}…${wallet.slice(-4)}` : t("profile.connect")}
        </button>
      </div>
      <p className="notice">{t("dash.rates", { currency })}</p>

      {!!trials.length && (
        <section className="section">
          <h2>{t("dash.trials")}</h2>
          <div className="rail">
            {trials.map((sub) => (
              <button type="button" className="rail-item" key={sub.id} onClick={() => setRoute({ name: "detail", id: sub.id })}>
                <Mark color={sub.color} label={sub.emoji} />
                <span>
                  <span className="row-title">{sub.name}</span>
                  <span className="row-meta">{formatDay(sub.trialEndsAt!, i18n.language)}</span>
                </span>
                <span className="badge warn">{formatDay(sub.trialEndsAt!, i18n.language)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <h2>{t("dash.upcoming")}</h2>
        <div className="rail">
          {upcoming.map((event) => (
            <button type="button" className="rail-item" key={event.id} onClick={() => setRoute({ name: "detail", id: event.subscriptionId })}>
              <Mark color={event.color} label={event.emoji} />
              <span>
                <span className="row-title">{event.name}</span>
                <span className="row-meta">{formatDay(event.at, i18n.language)}</span>
              </span>
              <span className="amount">{formatMoney(inDisplay(event.amount, event.currency, currency), currency)}</span>
            </button>
          ))}
