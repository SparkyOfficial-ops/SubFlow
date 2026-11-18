import { FREE_SUBSCRIPTION_LIMIT, newChainNonce, type DisplayCurrency } from "@subflow/shared";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as api from "./api";
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
  telegramId?: string;
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
  applyServer: (patch: {
    displayCurrency: DisplayCurrency;
    notifyDays: number[];
    plus: boolean;
    walletAddress?: string;
    telegramId?: string;
    subscriptions?: Subscription[];
    plans?: CreatorPlan[];
    splits?: SplitPool[];
  }) => void;
  canAdd: () => boolean;
  addSubscription: (input: Omit<Subscription, "id" | "status">) => string | null;
  updateSubscription: (id: string, patch: Partial<Subscription>) => void;
  removeSubscription: (id: string) => void;
  renewLocal: (id: string) => void;
  loadDemo: () => void;
  saveSplit: (pool: SplitPool) => void;
  rememberSplit: (pool: SplitPool) => void;
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
      setCurrency: (displayCurrency) => {
        set({ displayCurrency });
        void api.patchMe({ displayCurrency });
      },
      toggleNotify: (day) => {
        const has = get().notifyDays.includes(day);
        const notifyDays = has ? get().notifyDays.filter((item) => item !== day) : [...get().notifyDays, day].sort((a, b) => b - a);
        const next = notifyDays.length ? notifyDays : [day];
        set({ notifyDays: next });
        void api.patchMe({ notifyDays: next });
      },
      setPlus: (plus) => set({ plus }),
      setWallet: (walletAddress) => {
        set({ walletAddress });
        void api.patchMe({ walletAddress: walletAddress ?? null });
      },
      applyServer: (patch) =>
        set((state) => ({
          displayCurrency: patch.displayCurrency,
          notifyDays: patch.notifyDays,
          plus: patch.plus,
          walletAddress: patch.walletAddress,
          telegramId: patch.telegramId,
          subscriptions: patch.subscriptions ?? state.subscriptions,
          plans: patch.plans ?? state.plans,
          splits: patch.splits ?? state.splits,
        })),
      canAdd: () => {
        const state = get();
        if (state.plus) return true;
        return state.subscriptions.filter((item) => item.status !== "cancelled").length < FREE_SUBSCRIPTION_LIMIT;
      },
      addSubscription: (input) => {
        if (!get().canAdd()) return null;
        const id = uid();
        const created: Subscription = { ...input, id, chainNonce: input.chainNonce || newChainNonce(), status: "active" };
        set((state) => ({ subscriptions: [created, ...state.subscriptions] }));
        void api.saveSubscription(created);
        return id;
      },
      updateSubscription: (id, patch) => {
        set((state) => ({
          subscriptions: state.subscriptions.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        }));
        const keys = Object.keys(patch);
        const statusOnly = keys.every((key) => key === "status" || key === "nextChargeAt" || key === "note");
        if (statusOnly) void api.patchSubscription(id, patch);
        else {
          const next = get().subscriptions.find((item) => item.id === id);
          if (next) void api.saveSubscription(next);
        }
      },
      removeSubscription: (id) => {
        set((state) => ({
          subscriptions: state.subscriptions.filter((item) => item.id !== id),
          splits: state.splits.filter((pool) => pool.subscriptionId !== id),
        }));
        void api.deleteSubscription(id);
      },
      renewLocal: (id) => {
        const current = get().subscriptions.find((item) => item.id === id);
        if (!current) return;
        const nextChargeAt = shiftCharge(current);
        set((state) => ({
          subscriptions: state.subscriptions.map((item) => (item.id === id ? { ...item, status: "active", nextChargeAt, isTrial: false } : item)),
        }));
        void api.patchSubscription(id, { status: "active", nextChargeAt });
      },
      loadDemo: () => {
        if (get().subscriptions.length) return;
        const demo: Subscription[] = TEMPLATES.slice(0, 5).map((template, index) => ({
          id: uid(),
          chainNonce: newChainNonce(),
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
        set({ subscriptions: demo });
        for (const item of demo) void api.saveSubscription(item);
      },
      saveSplit: (pool) => {
        set((state) => {
          const rest = state.splits.filter((item) => item.id !== pool.id && item.subscriptionId !== pool.subscriptionId);
          return { splits: [pool, ...rest] };
        });
        void api.saveSplit(pool);
      },
      rememberSplit: (pool) =>
        set((state) => ({ splits: [pool, ...state.splits.filter((item) => item.id !== pool.id)] })),
      markShare: (poolId, memberId) => {
        set((state) => ({
          splits: state.splits.map((pool) =>
            pool.id === poolId
              ? { ...pool, members: pool.members.map((member) => (member.id === memberId ? { ...member, status: "paid" } : member)) }
              : pool,
          ),
        }));
        void api.markSplitPaid(poolId, memberId);
      },
      savePlan: (plan) => {
        const stored = { ...plan, chainNonce: plan.chainNonce || newChainNonce() };
        set((state) => ({
          plans: [stored, ...state.plans.filter((item) => item.id !== stored.id)],
        }));
        void api.savePlan(stored);
      },
      removePlan: (id) => set((state) => ({ plans: state.plans.filter((item) => item.id !== id) })),
    }),
    {
      name: "subflow-v1",
      partialize: (state) => ({
        onboarded: state.onboarded,
        displayCurrency: state.displayCurrency,
        notifyDays: state.notifyDays,
        plus: state.plus,
        walletAddress: state.walletAddress,
        subscriptions: state.subscriptions,
        splits: state.splits,
        plans: state.plans,
      }),
    },
  ),
);
