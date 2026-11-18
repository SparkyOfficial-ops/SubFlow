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
  chainNonce?: string;
}

export interface SplitMember {
  id: string;
  name: string;
  share: number;
  status: "paid" | "pending";
  isSelf?: boolean;
}

export interface SplitPool {
  id: string;
  subscriptionId: string;
  organizerAddress?: string;
  title?: string;
  amount?: number;
  currency?: string;
  color?: string;
  members: SplitMember[];
}

export interface CreatorPlan {
  id: string;
  title: string;
  amount: number;
  currency: "TON" | "USDT" | "STARS";
  period: PlanPeriod;
  chatId?: string;
  chainNonce?: string;
  ownerWallet?: string;
}

export type Tab = "home" | "subs" | "calendar" | "creator" | "profile";

export type Route =
  | { name: Tab }
  | { name: "add" }
  | { name: "detail"; id: string }
  | { name: "split"; subscriptionId?: string; poolId?: string }
  | { name: "checkout"; planId: string }
  | { name: "plan" };
