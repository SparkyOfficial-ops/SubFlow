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
