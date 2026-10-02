import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PLAN_PERIODS, type PlanPeriod } from "@subflow/shared";
import { createStarsInvoice } from "../api";
import { formatMoney } from "../money";
import { useAppStore } from "../store";
import type { CreatorPlan } from "../types";
import { haptic, runtime } from "../telegram";

export function CreatorHub() {
  const { t } = useTranslation();
  const plans = useAppStore((state) => state.plans);
  const save = useAppStore((state) => state.savePlan);
  const remove = useAppStore((state) => state.removePlan);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("5");
  const [currency, setCurrency] = useState<CreatorPlan["currency"]>("TON");
  const [period, setPeriod] = useState<PlanPeriod>("month");
  const [chatId, setChatId] = useState("");
  const [note, setNote] = useState("");
  const bot = import.meta.env.VITE_BOT_USERNAME || "SubFlowBot";

  const submit = () => {
    const value = Number(amount);
    if (!title.trim() || !value) return;
    save({
      id: crypto.randomUUID(),
      title: title.trim(),
      amount: value,
      currency,
      period,
      chatId: chatId.trim() || undefined,
    });
    setTitle("");
    setOpen(false);
    void haptic("success");
  };

  const stars = async (plan: CreatorPlan) => {
    if (!runtime.inTelegram || !window.Telegram?.WebApp?.openInvoice) {
      setNote(t("pay.starsNeedTg"));
      return;
    }
    const url = await createStarsInvoice({ id: plan.id, title: plan.title, amount: Math.round(plan.amount) });
    if (!url) {
      setNote(t("pay.starsNeedTg"));
      return;
    }
    window.Telegram.WebApp.openInvoice(url, (status) => {
      setNote(status === "paid" ? t("pay.sent") : t("pay.failed"));
    });
  };

  return (
    <div>
      <h1 className="screen-title">{t("creator.title")}</h1>
      <p className="muted">{t("creator.lead")}</p>
      <div className="hero" style={{ marginTop: 14 }}>
        <div className="spread"><span>{t("creator.mrr")}</span><b>0</b></div>
        <div className="spread" style={{ marginTop: 8 }}><span>{t("creator.active")}</span><b>0</b></div>
        <div className="spread" style={{ marginTop: 8 }}><span>{t("creator.churn")}</span><b>0%</b></div>
        <p className="notice">{t("creator.analyticsEmpty")}</p>
      </div>
      <p className="notice">{t("creator.chatHint", { bot })}</p>
      <section className="section">
        <h2>{t("creator.plans")}</h2>
        <div className="rail">
          {plans.map((plan) => (
            <div className="plan" key={plan.id}>
              <div className="spread">
                <b>{plan.title}</b>
                <span>{formatMoney(plan.amount, plan.currency)}</span>
              </div>
              <p className="row-meta">{t(`periods.${plan.period}`)}{plan.chatId ? ` · ${plan.chatId}` : ""}</p>
              <p className="row-meta">{t("creator.sell")}: t.me/{bot}/app?startapp=plan_{plan.id}</p>
              <div className="stack" style={{ marginTop: 8 }}>
                {plan.currency === "STARS" && (
                  <button type="button" className="primary" onClick={() => void stars(plan)}>{t("creator.stars")}</button>
                )}
                <button type="button" className="danger" onClick={() => remove(plan.id)}>{t("detail.remove")}</button>
              </div>
            </div>
          ))}
          {!plans.length && <p className="muted">{t("creator.empty")}</p>}
        </div>
      </section>
      {!open ? (
        <button type="button" className="primary" style={{ marginTop: 16 }} onClick={() => setOpen(true)}>{t("creator.newPlan")}</button>
      ) : (
        <div>
          <label className="field">{t("creator.name")}<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label className="field">{t("creator.price")}<input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
          <label className="field">
            {t("add.currency")}
            <select value={currency} onChange={(event) => setCurrency(event.target.value as CreatorPlan["currency"])}>
              <option value="TON">TON</option>
              <option value="USDT">USDT</option>
              <option value="STARS">Stars</option>
            </select>
          </label>
          <label className="field">
            {t("creator.period")}
            <select value={period} onChange={(event) => setPeriod(event.target.value as PlanPeriod)}>
              {PLAN_PERIODS.map((item) => <option key={item} value={item}>{t(`periods.${item}`)}</option>)}
            </select>
          </label>
          <label className="field">{t("creator.chat")}<input value={chatId} onChange={(event) => setChatId(event.target.value)} placeholder="-100..." /></label>
          <div className="stack" style={{ marginTop: 12 }}>
            <button type="button" className="primary" onClick={submit}>{t("creator.save")}</button>
            <button type="button" className="ghost" onClick={() => setOpen(false)}>{t("subs.later")}</button>
          </div>
        </div>
      )}
      {note && <p className="notice">{note}</p>}
