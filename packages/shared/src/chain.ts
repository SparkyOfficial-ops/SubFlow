import { Address, Cell, beginCell, toNano } from "@ton/core";

/** Совпадает с message(0xA1F0C701) PayTon в contracts/subscription_router.tact. */
export const PAY_TON_OPCODE = 0xa1f0c701;

export function payTonPayload(input: { merchant: string; chainNonce: bigint | string; telegramId: bigint | string }): string {
  return beginCell()
    .storeUint(PAY_TON_OPCODE, 32)
    .storeAddress(Address.parse(input.merchant))
    .storeUint(BigInt(input.chainNonce), 64)
    .storeUint(BigInt(input.telegramId), 64)
    .endCell()
    .toBoc()
    .toString("base64");
}

export function decodePayTon(cell: Cell): { merchant: string; chainNonce: bigint; telegramId: bigint } | null {
  const slice = cell.beginParse();
  if (slice.remainingBits < 32 + 267 + 64 + 64) return null;
  if (slice.loadUint(32) !== PAY_TON_OPCODE) return null;
  const merchant = slice.loadAddress();
  if (!merchant) return null;
  return {
    merchant: merchant.toString(),
    chainNonce: slice.loadUintBig(64),
    telegramId: slice.loadUintBig(64),
  };
}

/** forward_payload контракта: uint32(0) + uint64(subscriptionId) + uint64(userId) + Address(merchant). */
export function jettonTransferPayload(input: {
  amount: bigint;
  router: string;
  responseAddress: string;
  chainNonce: bigint | string;
  telegramId: bigint | string;
  merchant: string;
  forwardTon?: bigint;
}): string {
  const forward = beginCell()
    .storeUint(0, 32)
    .storeUint(BigInt(input.chainNonce), 64)
    .storeUint(BigInt(input.telegramId), 64)
    .storeAddress(Address.parse(input.merchant))
    .endCell();
  return beginCell()
    .storeUint(0x0f8a7ea5, 32)
    .storeUint(0, 64)
    .storeCoins(input.amount)
    .storeAddress(Address.parse(input.router))
    .storeAddress(Address.parse(input.responseAddress))
    .storeBit(0)
    .storeCoins(input.forwardTon ?? toNano("0.05"))
    .storeBit(1)
    .storeRef(forward)
    .endCell()
    .toBoc()
    .toString("base64");
}

export function decodeJettonTransfer(cell: Cell): {
  amount: bigint;
  destination: string;
  chainNonce: bigint;
  telegramId: bigint;
  merchant: string;
} | null {
  const slice = cell.beginParse();
  if (slice.remainingBits < 32 || slice.loadUint(32) !== 0x0f8a7ea5) return null;
  slice.loadUintBig(64);
  const amount = slice.loadCoins();
  const destination = slice.loadAddress()?.toString();
  if (!destination) return null;
  slice.loadAddress();
  if (slice.loadBit()) slice.loadRef();
  slice.loadCoins();
  const payload = slice.loadBit() ? slice.loadRef().beginParse() : slice;
  if (payload.remainingBits < 32 + 64 + 64 + 267) return null;
  if (payload.loadUint(32) !== 0) return null;
  const chainNonce = payload.loadUintBig(64);
  const telegramId = payload.loadUintBig(64);
  const merchant = payload.loadAddress();
  if (!merchant) return null;
  return { amount, destination, chainNonce, telegramId, merchant: merchant.toString() };
}

export function externalMessageHash(boc: string): string {
  return Cell.fromBase64(boc).hash().toString("hex");
}
