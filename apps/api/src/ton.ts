import { Address } from "@ton/core";

export function sameAddress(left: string, right: string): boolean {
  try {
    return Address.parse(left).equals(Address.parse(right));
  } catch {
    return left === right;
  }
}

interface TonMessage {
  value?: string | number;
  destination?: { address?: string };
  decoded_op_name?: string;
  decoded_body?: { text?: string; amount?: string | number } | null;
}

interface TonTransaction {
  hash: string;
  success?: boolean;
  in_msg?: TonMessage;
}

export interface ConfirmedTransfer {
  hash: string;
  payer?: string;
}

/** Ищет уже финализированный перевод на контракт платформы. Клиентский boc доказательством не считается. */
export async function findRouterTransfer(input: {
  comment: string;
  currency: "TON" | "USDT";
  minUnits: bigint;
}): Promise<ConfirmedTransfer | null> {
  const router = process.env.ROUTER_ADDRESS;
  if (!router) return null;
  const endpoint = (process.env.TONAPI_ENDPOINT || "https://tonapi.io").replace(/\/$/, "");
  const headers: Record<string, string> = {};
  if (process.env.TONAPI_KEY) headers.Authorization = `Bearer ${process.env.TONAPI_KEY}`;
  const response = await fetch(`${endpoint}/v2/blockchain/accounts/${encodeURIComponent(router)}/transactions?limit=40`, { headers });
  if (!response.ok) return null;
  const body = (await response.json()) as { transactions?: TonTransaction[] };
  for (const tx of body.transactions ?? []) {
    if (tx.success === false) continue;
    const message = tx.in_msg;
    const destination = message?.destination?.address;
    if (!destination || !sameAddress(destination, router)) continue;
    if (input.currency === "TON") {
      const text = message?.decoded_body?.text ?? "";
      const value = BigInt(message?.value ?? 0);
      if (text === input.comment && value >= input.minUnits) return { hash: tx.hash };
    } else {
      const decoded = message?.decoded_body;
      if (!decoded) continue;
      const serialized = JSON.stringify(decoded);
      const amount = BigInt(decoded.amount ?? 0);
      const looksLikeJetton = (message?.decoded_op_name ?? "").toLowerCase().includes("jetton") || "amount" in decoded;
      if (looksLikeJetton && serialized.includes(input.comment) && amount >= input.minUnits) return { hash: tx.hash };
    }
  }
  return null;
}
