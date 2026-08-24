const base = () => import.meta.env.VITE_API_URL?.replace(/\/$/, "");

export interface Session {
  token: string;
  user: { id: string; firstName: string; language: string };
}

let token: string | undefined;

export function sessionToken(): string | undefined {
  return token;
}

export async function authenticate(): Promise<Session | null> {
  const root = base();
  const initData = window.Telegram?.WebApp?.initData;
  if (!root || !initData) return null;
  const response = await fetch(`${root}/auth/telegram`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ initData }),
  });
  if (!response.ok) return null;
  const session = (await response.json()) as Session;
  token = session.token;
  return session;
}

export async function createStarsInvoice(plan: { id: string; title: string; amount: number }): Promise<string | null> {
  const root = base();
  if (!root || !token) return null;
  const response = await fetch(`${root}/creators/invoices`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(plan),
  });
  if (!response.ok) return null;
  const body = (await response.json()) as { url?: string };
  return body.url ?? null;
}

export async function submitChainPayment(input: { txHash: string; comment: string; currency: "TON" | "USDT" }): Promise<boolean> {
  const root = base();
  if (!root || !token) return false;
  const response = await fetch(`${root}/payments/chain`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  return response.ok;
}
