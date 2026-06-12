export const DISPLAY_CURRENCIES = ["USD", "EUR", "UAH", "TON"] as const;
export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

export const MONEY_CURRENCIES = ["USD", "EUR", "UAH", "TON", "USDT", "STARS"] as const;
export type MoneyCurrency = (typeof MONEY_CURRENCIES)[number];

export const SUB_PERIODS = ["week", "month", "quarter", "year", "custom"] as const;
export type SubPeriod = (typeof SUB_PERIODS)[number];

export const PLAN_PERIODS = ["month", "quarter", "forever"] as const;
export type PlanPeriod = (typeof PLAN_PERIODS)[number];
