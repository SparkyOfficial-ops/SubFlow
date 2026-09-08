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
