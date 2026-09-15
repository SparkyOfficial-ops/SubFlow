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
