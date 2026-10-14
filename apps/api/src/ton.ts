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
