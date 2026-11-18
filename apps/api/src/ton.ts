import { Address, Cell } from "@ton/core";
import { USDT_MASTER, decodeJettonTransfer, decodePayTon } from "@subflow/shared";

export function sameAddress(left: string, right: string): boolean {
  try {
    return Address.parse(left).equals(Address.parse(right));
  } catch {
    return false;
  }
}

export interface ChainMessage {
  value?: string | number;
  destination?: { address?: string } | string;
  raw_body?: string;
  msg_data?: { body?: string };
}

export interface ChainTransaction {
  hash?: string;
  success?: boolean;
  account?: { address?: string };
  in_msg?: ChainMessage | null;
  out_msgs?: ChainMessage[];
}

export interface ExpectedPayment {
  currency: "TON" | "USDT";
  router: string;
  chainNonce: bigint;
  telegramId: bigint;
  minUnits: bigint;
  merchant?: string;
  /** Настоящий USDT-кошелёк плательщика, выпущенный мастер-контрактом USDT. */
  usdtWallet?: string;
}

function destinationOf(message: ChainMessage): string | undefined {
  if (!message.destination) return undefined;
  return typeof message.destination === "string" ? message.destination : message.destination.address;
}

function bodyOf(message: ChainMessage): Cell | null {
  const raw = message.raw_body || message.msg_data?.body;
  if (!raw) return null;
  try {
    return Cell.fromBase64(raw);
  } catch {
    try {
      return Cell.fromBoc(Buffer.from(raw, "hex"))[0] ?? null;
    } catch {
      return null;
    }
  }
}

function merchantOk(found: string, expected?: string): boolean {
  return !expected || sameAddress(found, expected);
}

/** Сверяет уже попавшую в блок транзакцию с ожидаемым платежом. Комментарий в JSON не принимается. */
export function paymentMatches(tx: ChainTransaction, expected: ExpectedPayment): boolean {
  if (tx.success === false) return false;
  const messages = [tx.in_msg, ...(tx.out_msgs ?? [])].filter((item): item is ChainMessage => Boolean(item));
  for (const message of messages) {
    const cell = bodyOf(message);
    if (!cell) continue;
    if (expected.currency === "TON") {
      const decoded = decodePayTon(cell);
      const destination = destinationOf(message);
      const value = BigInt(message.value ?? 0);
      if (!decoded || !destination || !sameAddress(destination, expected.router)) continue;
      if (decoded.chainNonce !== expected.chainNonce || decoded.telegramId !== expected.telegramId) continue;
      if (!merchantOk(decoded.merchant, expected.merchant) || value < expected.minUnits) continue;
      return true;
    }
    if (!expected.usdtWallet) continue;
    const jettonDestination = destinationOf(message);
    if (!jettonDestination || !sameAddress(jettonDestination, expected.usdtWallet)) continue;
    const decoded = decodeJettonTransfer(cell);
    if (!decoded || !sameAddress(decoded.destination, expected.router)) continue;
    if (decoded.chainNonce !== expected.chainNonce || decoded.telegramId !== expected.telegramId) continue;
    if (!merchantOk(decoded.merchant, expected.merchant) || decoded.amount < expected.minUnits) continue;
    return true;
  }
  return false;
}

function endpoint(): string {
  return (process.env.TONAPI_ENDPOINT || "https://tonapi.io").replace(/\/$/, "");
}

function headers(): Record<string, string> {
  const result: Record<string, string> = {};
  if (process.env.TONAPI_KEY) result.Authorization = `Bearer ${process.env.TONAPI_KEY}`;
  return result;
}

export async function fetchMessageTransaction(messageHash: string): Promise<ChainTransaction | null> {
  const response = await fetch(`${endpoint()}/v2/blockchain/messages/${encodeURIComponent(messageHash)}/transaction`, { headers: headers() });
  if (!response.ok) return null;
  return (await response.json()) as ChainTransaction;
}

/** Кошелёк USDT, который TonAPI выводит из мастер-контракта, а не из комментария перевода. */
export async function officialUsdtWallet(owner: string): Promise<string | null> {
  const master = process.env.USDT_MASTER || USDT_MASTER;
  const response = await fetch(`${endpoint()}/v2/accounts/${encodeURIComponent(owner)}/jettons/${encodeURIComponent(master)}`, { headers: headers() });
  if (!response.ok) return null;
  const body = (await response.json()) as { wallet_address?: { address?: string } };
  return body.wallet_address?.address ?? null;
}
