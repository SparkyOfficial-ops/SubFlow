export const DISPLAY_CURRENCIES = ["USD", "EUR", "UAH", "TON"] as const;
export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

export const MONEY_CURRENCIES = ["USD", "EUR", "UAH", "TON", "USDT", "STARS"] as const;
export type MoneyCurrency = (typeof MONEY_CURRENCIES)[number];

export const SUB_PERIODS = ["week", "month", "quarter", "year", "custom"] as const;
export type SubPeriod = (typeof SUB_PERIODS)[number];

export const PLAN_PERIODS = ["month", "quarter", "forever"] as const;
export type PlanPeriod = (typeof PLAN_PERIODS)[number];

export const CATEGORIES = ["entertainment", "work", "vpn", "telegram", "other"] as const;
export type Category = (typeof CATEGORIES)[number];

export const PAYMENT_METHODS = ["card", "ton", "usdt", "stars", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const SUB_STATUSES = ["active", "paused", "cancelled"] as const;
export type SubStatus = (typeof SUB_STATUSES)[number];

/** Ориентир для пересчёта. Боевые курсы подставляются с бэкенда. */
export const USD_PER_UNIT: Record<MoneyCurrency, number> = {
  USD: 1,
  EUR: 1.08,
  UAH: 0.024,
  TON: 5.2,
  USDT: 1,
  STARS: 0.02,
};

export const FREE_SUBSCRIPTION_LIMIT = 5;
export const DEFAULT_NOTIFY_DAYS = [7, 3, 1] as const;
export const DEFAULT_FEE_BPS = 150;
