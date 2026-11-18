import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CATEGORIES,
  MONEY_CURRENCIES,
  PAYMENT_METHODS,
  SUB_PERIODS,
  type Category,
  type MoneyCurrency,
  type PaymentMethod,
  type SubPeriod,
} from "@subflow/shared";
import { ActionBar, useTelegramChrome } from "../components/ui";
import { dateInputToIso, isoDateInput } from "../money";
import { useAppStore } from "../store";
import { TEMPLATES } from "../templates";
import { haptic } from "../telegram";

export function AddSubscription() {
  const { t } = useTranslation();
  const add = useAppStore((state) => state.addSubscription);
  const setRoute = useAppStore((state) => state.setRoute);
  const [templateId, setTemplateId] = useState<string | null>(TEMPLATES[0]?.id ?? null);
  const template = TEMPLATES.find((item) => item.id === templateId);
  const [name, setName] = useState(template?.name ?? "");
  const [amount, setAmount] = useState(String(template?.amount ?? ""));
  const [currency, setCurrency] = useState<MoneyCurrency>(template?.currency ?? "USD");
  const [period, setPeriod] = useState<SubPeriod>(template?.period ?? "month");
  const [customDays, setCustomDays] = useState("30");
  const [date, setDate] = useState(isoDateInput(new Date().toISOString()));
  const [category, setCategory] = useState<Category>(template?.category ?? "other");
  const [method, setMethod] = useState<PaymentMethod>(template?.method ?? "card");
  const [note, setNote] = useState("");
  const [trial, setTrial] = useState(false);
  const [trialDate, setTrialDate] = useState(date);
  const [error, setError] = useState("");

  const clearTemplate = () => {
    setTemplateId(null);
    setName("");
    setAmount("");
    setCurrency("USD");
    setPeriod("month");
    setCategory("other");
    setMethod("card");
  };

  const apply = (id: string) => {
    const next = TEMPLATES.find((item) => item.id === id);
    if (!next) return;
    setTemplateId(id);
    setName(next.name);
    setAmount(String(next.amount));
    setCurrency(next.currency);
    setPeriod(next.period);
    setCategory(next.category);
    setMethod(next.method);
  };

  const save = () => {
    const value = Number(amount);
    if (!name.trim() || !value || !date) {
      setError(t("add.required"));
      void haptic("error");
      return;
    }
    const id = add({
      name: name.trim(),
      emoji: template?.emoji ?? name.trim().slice(0, 1).toUpperCase(),
      color: template?.color ?? "#5b6b7c",
      amount: value,
      currency,
      period,
      customDays: period === "custom" ? Number(customDays) || 30 : undefined,
      nextChargeAt: dateInputToIso(date),
      paymentMethod: method,
      category,
      note: note.trim() || undefined,
      isTrial: trial,
      trialEndsAt: trial ? dateInputToIso(trialDate) : undefined,
      templateId: template?.id,
    });
    if (!id) {
      setError(t("subs.limitText"));
      return;
    }
    void haptic("success");
    setRoute({ name: "detail", id });
  };

  useTelegramChrome(() => setRoute({ name: "subs" }), { text: t("add.save"), onClick: save });

  return (
    <div>
      <div className="topbar">
        <button type="button" className="icon-btn" onClick={() => setRoute({ name: "subs" })}>
          ←
        </button>
        <h1>{t("add.title")}</h1>
      </div>
      <p className="eyebrow">{t("add.templates")}</p>
      <div className="templates">
        <button type="button" className={templateId === null ? "template active" : "template"} onClick={clearTemplate}>
          <span className="mark" style={{ background: "#5b6b7c", width: 28, height: 28 }}>Aa</span>
          <span className="row-meta" style={{ display: "block", marginTop: 8 }}>{t("add.custom")}</span>
        </button>
        {TEMPLATES.map((item) => (
          <button type="button" key={item.id} className={item.id === templateId ? "template active" : "template"} onClick={() => apply(item.id)}>
            <span className="mark" style={{ background: item.color, width: 28, height: 28 }}>{item.emoji}</span>
            <span className="row-meta" style={{ display: "block", marginTop: 8 }}>{item.name}</span>
          </button>
        ))}
      </div>
      <label className="field">{t("add.name")}<input value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label className="field">{t("add.amount")}<input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
      <label className="field">
        {t("add.currency")}
        <select value={currency} onChange={(event) => setCurrency(event.target.value as MoneyCurrency)}>
          {MONEY_CURRENCIES.map((item) => <option key={item} value={item}>{t(`currencies.${item}`)}</option>)}
        </select>
      </label>
      <label className="field">
        {t("add.period")}
        <select value={period} onChange={(event) => setPeriod(event.target.value as SubPeriod)}>
          {SUB_PERIODS.map((item) => <option key={item} value={item}>{t(`periods.${item}`)}</option>)}
        </select>
      </label>
      {period === "custom" && (
        <label className="field">
          {t("periods.custom")}
          <input inputMode="numeric" value={customDays} onChange={(event) => setCustomDays(event.target.value)} />
        </label>
      )}
      <label className="field">{t("add.date")}<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
      <label className="field">
        {t("add.category")}
        <select value={category} onChange={(event) => setCategory(event.target.value as Category)}>
          {CATEGORIES.map((item) => <option key={item} value={item}>{t(`categories.${item}`)}</option>)}
        </select>
      </label>
      <label className="field">
        {t("add.method")}
        <select value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>
          {PAYMENT_METHODS.map((item) => <option key={item} value={item}>{t(`methods.${item}`)}</option>)}
        </select>
      </label>
      <label className="field">{t("add.note")}<textarea value={note} onChange={(event) => setNote(event.target.value)} /></label>
      <label className="check">
        {t("add.trial")}
        <input type="checkbox" checked={trial} onChange={(event) => setTrial(event.target.checked)} />
      </label>
      {trial && <label className="field">{t("add.trialDate")}<input type="date" value={trialDate} onChange={(event) => setTrialDate(event.target.value)} /></label>}
      {error && <p className="error">{error}</p>}
      <ActionBar text={t("add.save")} onClick={save} />
    </div>
  );
}
