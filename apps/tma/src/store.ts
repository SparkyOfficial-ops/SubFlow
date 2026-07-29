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
  date.setDate(date.getDate() + days);
  date.setHours(12, 0, 0, 0);
  return date.toISOString();
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      onboarded: false,
      displayCurrency: "USD",
      notifyDays: [...NOTIFY],
      plus: false,
      subscriptions: [],
      splits: [],
      plans: [],
      route: { name: "home" },
      finishOnboarding: () => set({ onboarded: true }),
      setRoute: (route) => set({ route }),
      setCurrency: (displayCurrency) => set({ displayCurrency }),
      toggleNotify: (day) =>
        set((state) => {
          const has = state.notifyDays.includes(day);
          const notifyDays = has ? state.notifyDays.filter((item) => item !== day) : [...state.notifyDays, day].sort((a, b) => b - a);
          return { notifyDays: notifyDays.length ? notifyDays : [day] };
        }),
      setPlus: (plus) => set({ plus }),
      setWallet: (walletAddress) => set({ walletAddress }),
      canAdd: () => {
        const state = get();
        if (state.plus) return true;
        return state.subscriptions.filter((item) => item.status !== "cancelled").length < FREE_SUBSCRIPTION_LIMIT;
      },
      addSubscription: (input) => {
        if (!get().canAdd()) return null;
        const id = uid();
        set((state) => ({ subscriptions: [{ ...input, id, status: "active" }, ...state.subscriptions] }));
        return id;
      },
      updateSubscription: (id, patch) =>
        set((state) => ({
          subscriptions: state.subscriptions.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        })),
      removeSubscription: (id) =>
        set((state) => ({
          subscriptions: state.subscriptions.filter((item) => item.id !== id),
          splits: state.splits.filter((pool) => pool.subscriptionId !== id),
        })),
      renewLocal: (id) =>
        set((state) => ({
          subscriptions: state.subscriptions.map((item) =>
            item.id === id ? { ...item, status: "active", nextChargeAt: shiftCharge(item), isTrial: false } : item,
          ),
        })),
      loadDemo: () =>
        set((state) => {
          if (state.subscriptions.length) return state;
          const demo: Subscription[] = TEMPLATES.slice(0, 5).map((template, index) => ({
            id: uid(),
            name: template.name,
            emoji: template.emoji,
            color: template.color,
            amount: template.amount,
            currency: template.currency,
            period: template.period,
            nextChargeAt: daysFromNow([2, 6, 11, 18, 40][index] ?? 14),
            paymentMethod: template.method,
            category: template.category,
            status: "active",
            isTrial: index === 4,
            trialEndsAt: index === 4 ? daysFromNow(4) : undefined,
            templateId: template.id,
          }));
          return { subscriptions: demo };
        }),
      saveSplit: (pool) =>
        set((state) => {
          const rest = state.splits.filter((item) => item.subscriptionId !== pool.subscriptionId);
          return { splits: [pool, ...rest] };
        }),
      markShare: (poolId, memberId) =>
        set((state) => ({
          splits: state.splits.map((pool) =>
            pool.id === poolId
              ? { ...pool, members: pool.members.map((member) => (member.id === memberId ? { ...member, status: "paid" } : member)) }
              : pool,
          ),
        })),
      savePlan: (plan) =>
        set((state) => ({
          plans: [plan, ...state.plans.filter((item) => item.id !== plan.id)],
        })),
      removePlan: (id) => set((state) => ({ plans: state.plans.filter((item) => item.id !== id) })),
