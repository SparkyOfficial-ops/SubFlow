import type { Category, MoneyCurrency, PaymentMethod, SubPeriod } from "@subflow/shared";

export interface Template {
  id: string;
  name: string;
  emoji: string;
  color: string;
  amount: number;
  currency: MoneyCurrency;
  period: SubPeriod;
  category: Category;
  method: PaymentMethod;
}

export const TEMPLATES: Template[] = [
