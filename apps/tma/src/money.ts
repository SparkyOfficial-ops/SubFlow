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
    return `${amount.toFixed(fraction)} ${currency}`;
  }
}

export function inDisplay(amount: number, from: MoneyCurrency, to: DisplayCurrency): number {
  return convertMoney(amount, from, to);
}

export function shiftCharge(sub: Pick<Subscription, "nextChargeAt" | "period" | "customDays">, times = 1): string {
  let cursor = new Date(sub.nextChargeAt);
  for (let i = 0; i < times; i += 1) cursor = addPeriod(cursor, sub.period, sub.customDays);
  return cursor.toISOString();
}

export interface ChargeEvent {
  id: string;
  subscriptionId: string;
  name: string;
  color: string;
  emoji: string;
  at: string;
  amount: number;
  currency: MoneyCurrency;
  kind: "charge" | "trial";
  category: Category;
}

export function eventsBetween(subs: Subscription[], from: Date, to: Date): ChargeEvent[] {
  const events: ChargeEvent[] = [];
  for (const sub of subs) {
    if (sub.status === "cancelled") continue;
    if (sub.isTrial && sub.trialEndsAt) {
      const trial = new Date(sub.trialEndsAt);
      if (trial >= from && trial <= to) {
        events.push({
          id: `${sub.id}-trial`,
          subscriptionId: sub.id,
          name: sub.name,
          color: sub.color,
          emoji: sub.emoji,
          at: sub.trialEndsAt,
          amount: sub.amount,
          currency: sub.currency,
          kind: "trial",
          category: sub.category,
        });
      }
    }
    if (sub.status !== "active") continue;
    let cursor = new Date(sub.nextChargeAt);
    let guard = 0;
    while (cursor <= to && guard < 80) {
      if (cursor >= from) {
        events.push({
          id: `${sub.id}-${cursor.toISOString()}`,
          subscriptionId: sub.id,
          name: sub.name,
          color: sub.color,
          emoji: sub.emoji,
          at: cursor.toISOString(),
          amount: sub.amount,
          currency: sub.currency,
          kind: "charge",
          category: sub.category,
        });
      }
      cursor = addPeriod(cursor, sub.period, sub.customDays);
      guard += 1;
    }
