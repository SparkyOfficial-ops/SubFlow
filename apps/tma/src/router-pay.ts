import { USDT_MASTER, jettonTransferPayload, payTonPayload } from "@subflow/shared";
import { toNano } from "@ton/core";

export async function routerMessage(input: {
  currency: "TON" | "USDT";
  amount: number;
  merchant: string;
  chainNonce: string;
  telegramId: string;
  router: string;
  payer: string;
}): Promise<{ to: string; amount: string; payload: string }> {
  if (input.currency === "TON") {
    return {
      to: input.router,
      amount: toNano(input.amount.toString()).toString(),
      payload: payTonPayload({ merchant: input.merchant, chainNonce: input.chainNonce, telegramId: input.telegramId }),
    };
  }
  const master = import.meta.env.VITE_USDT_MASTER || USDT_MASTER;
  const info = await fetch(`https://tonapi.io/v2/accounts/${encodeURIComponent(input.payer)}/jettons/${encodeURIComponent(master)}`);
  if (!info.ok) throw new Error("jetton");
  const body = (await info.json()) as { wallet_address?: { address?: string } };
  const jettonWallet = body.wallet_address?.address;
  if (!jettonWallet) throw new Error("wallet");
  return {
    to: jettonWallet,
    amount: toNano("0.08").toString(),
    payload: jettonTransferPayload({
      amount: BigInt(Math.round(input.amount * 1_000_000)),
      router: input.router,
      responseAddress: input.payer,
      chainNonce: input.chainNonce,
      telegramId: input.telegramId,
      merchant: input.merchant,
    }),
  };
}
