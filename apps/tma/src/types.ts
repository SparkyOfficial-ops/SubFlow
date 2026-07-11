import type {
  Category,
  MoneyCurrency,
  PaymentMethod,
  PlanPeriod,
  SubPeriod,
  SubStatus,
} from "@subflow/shared";

export interface Subscription {
  id: string;
  name: string;
  emoji: string;
  color: string;
  amount: number;
  currency: MoneyCurrency;
  period: SubPeriod;
  customDays?: number;
  nextChargeAt: string;
  paymentMethod: PaymentMethod;
  category: Category;
  status: SubStatus;
  note?: string;
  isTrial: boolean;
  trialEndsAt?: string;
  templateId?: string;
}

export interface SplitMember {
