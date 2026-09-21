import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Mark } from "../components/ui";
import { eventsBetween, formatDay, formatMoney } from "../money";
import { useAppStore } from "../store";

export function CalendarScreen() {
  const { t, i18n } = useTranslation();
  const subs = useAppStore((state) => state.subscriptions);
  const setRoute = useAppStore((state) => state.setRoute);
  const groups = useMemo(() => {
    const end = new Date();
    end.setDate(end.getDate() + 60);
    const events = eventsBetween(subs, new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()), end);
    const map = new Map<string, typeof events>();
    for (const event of events) {
      const key = event.at.slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), event]);
    }
    return [...map.entries()];
  }, [subs]);

  return (
