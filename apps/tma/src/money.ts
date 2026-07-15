import {
  addPeriod,
  annualized,
  convertMoney,
  type Category,
  type DisplayCurrency,
  type MoneyCurrency,
  type PaymentMethod,
} from "@subflow/shared";
import type { Subscription } from "./types";

export function formatMoney(amount: number, currency: MoneyCurrency | DisplayCurrency, digits?: number): string {
  if (currency === "STARS") return `${Math.round(amount)} ★`;
  const fraction = digits ?? (currency === "TON" ? 2 : currency === "UAH" ? 0 : 2);
  try {
    if (currency === "TON" || currency === "USDT") {
      return `${amount.toLocaleString(undefined, { minimumFractionDigits: fraction, maximumFractionDigits: fraction })} ${currency}`;
    }
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: fraction,
      minimumFractionDigits: fraction,
    }).format(amount);
  } catch {
