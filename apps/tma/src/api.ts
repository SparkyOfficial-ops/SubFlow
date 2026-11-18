import type { DisplayCurrency } from "@subflow/shared";
import type { CreatorPlan, SplitPool, Subscription } from "./types";

const root = () => import.meta.env.VITE_API_URL?.replace(/\/$/, "");

export interface RemoteUser {
  id: string;
  firstName: string;
  language: string;
  displayCurrency: DisplayCurrency;
  notifyDays: number[];
  walletAddress: string | null;
  plusUntil: string | null;
  telegramId: string;
}

export interface Session {
  token: string;
  user: RemoteUser;
}

let token: string | undefined;

export function sessionToken(): string | undefined {
  return token;
}

async function request<T>(path: string, init?: { method?: string; body?: unknown; auth?: boolean }): Promise<T | null> {
  const base = root();
  if (!base) return null;
  if (init?.auth !== false && !token) return null;
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token && init?.auth !== false) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`${base}${path}`, {
    method: init?.method ?? "GET",
    headers,
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  });
  if (!response.ok) return null;
  return (await response.json()) as T;
}

export async function authenticate(): Promise<Session | null> {
  const initData = window.Telegram?.WebApp?.initData;
  if (!root() || !initData) return null;
  const response = await fetch(`${root()}/auth/telegram`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ initData }),
  });
  if (!response.ok) return null;
  const session = (await response.json()) as Session;
  token = session.token;
  return session;
}

export function me(): Promise<RemoteUser | null> {
  return request<RemoteUser>("/auth/me");
}

export function patchMe(body: { displayCurrency?: string; notifyDays?: number[]; walletAddress?: string | null }): Promise<RemoteUser | null> {
  return request<RemoteUser>("/auth/me", { method: "PATCH", body });
}

export function listSubscriptions(): Promise<Subscription[] | null> {
  return request<Subscription[]>("/subscriptions");
}

export function saveSubscription(body: Subscription): Promise<Subscription | null> {
  return request<Subscription>("/subscriptions", { method: "POST", body });
}

export function patchSubscription(id: string, body: { status?: string; nextChargeAt?: string; note?: string }): Promise<Subscription | null> {
  return request<Subscription>(`/subscriptions/${id}`, { method: "PATCH", body });
}

export function deleteSubscription(id: string): Promise<{ ok: boolean } | null> {
  return request(`/subscriptions/${id}`, { method: "DELETE" });
}

export function listPlans(): Promise<CreatorPlan[] | null> {
  return request<CreatorPlan[]>("/creators/plans");
}

export function savePlan(body: CreatorPlan): Promise<CreatorPlan | null> {
  return request<CreatorPlan>("/creators/plans", { method: "POST", body });
}

export function publicPlan(id: string): Promise<(CreatorPlan & { ownerWallet?: string | null }) | null> {
  return request(`/plans/${id}`, { auth: false });
}

export function analytics(): Promise<{ mrr: number; active: number; churn: number } | null> {
  return request("/creators/analytics");
}

export function listSplits(): Promise<SplitPool[] | null> {
  return request<SplitPool[]>("/splits");
}

export function getSplit(id: string): Promise<SplitPool | null> {
  return request<SplitPool>(`/splits/${id}`, { auth: false });
}

export function saveSplit(body: SplitPool): Promise<SplitPool | null> {
  return request<SplitPool>("/splits", { method: "POST", body });
}

export function markSplitPaid(poolId: string, memberId: string): Promise<SplitPool | null> {
  return request(`/splits/${poolId}/members/${memberId}/paid`, { method: "POST", body: {} });
}

export async function createStarsInvoice(plan: { id: string; title: string; amount: number }): Promise<string | null> {
  const body = await request<{ url?: string }>("/creators/invoices", { method: "POST", body: plan });
  return body?.url ?? null;
}

export async function watchChainPayment(input: {
  boc: string;
  currency: "TON" | "USDT";
  chainNonce: string;
  kind: "plan" | "subscription";
}): Promise<"confirmed" | "pending" | "rejected" | "failed"> {
  const created = await request<{ id: string; status: string }>("/payments/chain", { method: "POST", body: input });
  if (!created) return "failed";
  if (created.status === "confirmed" || created.status === "rejected") return created.status;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 4000));
    const row = await request<{ status: string }>(`/payments/${created.id}`);
    if (row?.status === "confirmed" || row?.status === "rejected") return row.status;
  }
  return "pending";
}
