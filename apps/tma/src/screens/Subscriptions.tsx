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
