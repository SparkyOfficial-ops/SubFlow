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
