import { useState } from "react";
import { useTranslation } from "react-i18next";
import { formatMoney, inDisplay } from "../money";
import { Mark } from "../components/ui";
import { useAppStore } from "../store";
import { haptic } from "../telegram";

export function Subscriptions() {
  const { t } = useTranslation();
  const [archive, setArchive] = useState(false);
  const [limit, setLimit] = useState(false);
  const subs = useAppStore((state) => state.subscriptions);
  const currency = useAppStore((state) => state.displayCurrency);
  const setRoute = useAppStore((state) => state.setRoute);
  const canAdd = useAppStore((state) => state.canAdd);
  const visible = subs.filter((item) => (archive ? item.status === "cancelled" : item.status !== "cancelled"));

  const add = () => {
    void haptic("tap");
    if (!canAdd()) {
      setLimit(true);
      return;
    }
    setRoute({ name: "add" });
  };

  return (
    <div>
      <div className="topbar">
        <h1>{t("subs.title")}</h1>
        <button type="button" className="text-btn" style={{ marginLeft: "auto" }} onClick={add}>
          +
        </button>
      </div>
      <div className="chips">
        <button type="button" className={archive ? "chip" : "chip on"} onClick={() => setArchive(false)}>
          {t("subs.active")}
        </button>
        <button type="button" className={archive ? "chip on" : "chip"} onClick={() => setArchive(true)}>
          {t("subs.archive")}
        </button>
      </div>
      <div className="rail" style={{ marginTop: 12 }}>
        {visible.map((sub) => (
          <button type="button" className="row" key={sub.id} onClick={() => setRoute({ name: "detail", id: sub.id })}>
            <Mark color={sub.color} label={sub.emoji} />
            <span>
              <span className="row-title">
                {sub.name}
                {sub.status === "paused" && <span className="badge">{t("dash.paused")}</span>}
              </span>
              <span className="row-meta">{t(`periods.${sub.period}`)}</span>
            </span>
            <span className="amount">{formatMoney(inDisplay(sub.amount, sub.currency, currency), currency)}</span>
          </button>
        ))}
        {!visible.length && <p className="muted">{t("subs.empty")}</p>}
      </div>
      {limit && (
        <div className="sheet" onClick={() => setLimit(false)}>
          <div className="sheet-card" onClick={(event) => event.stopPropagation()}>
            <h3>{t("subs.limitTitle")}</h3>
            <p className="muted">{t("subs.limitText")}</p>
            <div className="stack">
              <button type="button" className="primary" onClick={() => setLimit(false)}>
                {t("subs.later")}
              </button>
