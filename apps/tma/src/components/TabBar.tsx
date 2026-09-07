import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store";
import type { Tab } from "../types";
import { haptic } from "../telegram";

const TABS: Tab[] = ["home", "subs", "calendar", "creator", "profile"];

function Icon({ name }: { name: Tab }) {
  const paths: Record<Tab, ReactNode> = {
    home: <path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5Z" />,
    subs: <path d="M6 6h12v4H6V6Zm0 6h12v6H6v-6Z" />,
    calendar: <path d="M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />,
    creator: <path d="M12 3 4 7v5c0 5 3.4 7.6 8 9 4.6-1.4 8-4 8-9V7l-8-4Z" />,
    profile: <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 8a7 7 0 0 1 14 0" />,
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

export function TabBar() {
  const { t } = useTranslation();
  const route = useAppStore((state) => state.route);
  const setRoute = useAppStore((state) => state.setRoute);
  const current = route.name === "add" || route.name === "detail" || route.name === "split" || route.name === "plan" ? "subs" : route.name;
  return (
    <nav className="tabs">
      {TABS.map((tab) => (
        <button
          type="button"
          key={tab}
          className={current === tab ? "active" : ""}
          onClick={() => {
            void haptic("tap");
            setRoute({ name: tab });
          }}
        >
          <Icon name={tab} />
          {t(`tabs.${tab}`)}
        </button>
      ))}
    </nav>
  );
}
