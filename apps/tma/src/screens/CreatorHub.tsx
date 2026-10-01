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
