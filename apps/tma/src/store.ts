import { FREE_SUBSCRIPTION_LIMIT, type DisplayCurrency } from "@subflow/shared";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { shiftCharge } from "./money";
import { TEMPLATES } from "./templates";
import type { CreatorPlan, Route, SplitPool, Subscription } from "./types";

const NOTIFY = [7, 3, 1] as const;

interface AppState {
  onboarded: boolean;
  displayCurrency: DisplayCurrency;
  notifyDays: number[];
  plus: boolean;
  walletAddress?: string;
  subscriptions: Subscription[];
  splits: SplitPool[];
  plans: CreatorPlan[];
  route: Route;
  finishOnboarding: () => void;
  setRoute: (route: Route) => void;
  setCurrency: (currency: DisplayCurrency) => void;
  toggleNotify: (day: number) => void;
  setPlus: (value: boolean) => void;
  setWallet: (address?: string) => void;
  canAdd: () => boolean;
  addSubscription: (input: Omit<Subscription, "id" | "status">) => string | null;
  updateSubscription: (id: string, patch: Partial<Subscription>) => void;
  removeSubscription: (id: string) => void;
  renewLocal: (id: string) => void;
  loadDemo: () => void;
  saveSplit: (pool: SplitPool) => void;
  markShare: (poolId: string, memberId: string) => void;
  savePlan: (plan: CreatorPlan) => void;
  removePlan: (id: string) => void;
}

function uid(): string {
  return crypto.randomUUID();
}

function daysFromNow(days: number): string {
  const date = new Date();
