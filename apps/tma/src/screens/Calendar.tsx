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
    <div>
      <h1 className="screen-title">{t("calendar.title")}</h1>
      {!groups.length && <p className="muted">{t("calendar.empty")}</p>}
      {groups.map(([day, events]) => (
        <div className="group" key={day}>
          <div className="group-label">{formatDay(events[0].at, i18n.language)}</div>
          <div className="rail">
            {events.map((event) => (
              <button type="button" className="row" key={event.id} onClick={() => setRoute({ name: "detail", id: event.subscriptionId })}>
                <Mark color={event.color} label={event.emoji} />
                <span>
                  <span className="row-title">{event.name}</span>
                  {event.kind === "trial" && <span className="row-meta">{t("calendar.trial")}</span>}
                </span>
                <span className="amount">{formatMoney(event.amount, event.currency)}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
