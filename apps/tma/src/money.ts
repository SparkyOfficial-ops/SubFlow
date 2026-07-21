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
  }
  return events.sort((a, b) => a.at.localeCompare(b.at));
}

export function monthSpend(subs: Subscription[], display: DisplayCurrency, now = new Date()): number {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return eventsBetween(subs, start, end)
    .filter((event) => event.kind === "charge")
    .reduce((sum, event) => sum + inDisplay(event.amount, event.currency, display), 0);
}

export function yearForecast(subs: Subscription[], display: DisplayCurrency): number {
  return subs
    .filter((sub) => sub.status === "active")
    .reduce((sum, sub) => sum + inDisplay(annualized(sub.amount, sub.period, sub.customDays), sub.currency, display), 0);
}

export function categoryTotals(subs: Subscription[], display: DisplayCurrency, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const totals = new Map<Category, number>();
  for (const event of eventsBetween(subs, start, end)) {
    if (event.kind !== "charge") continue;
    totals.set(event.category, (totals.get(event.category) ?? 0) + inDisplay(event.amount, event.currency, display));
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1]);
}

export function isoDateInput(iso: string): string {
  return iso.slice(0, 10);
}

export function dateInputToIso(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1, 12).toISOString();
}

export function formatDay(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short" });
}

export function formatLong(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
}

