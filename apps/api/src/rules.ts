export function graceDeadline(now: Date, graceHours: number): Date {
  return new Date(now.getTime() - graceHours * 60 * 60 * 1000);
}

export function starsTarget(payload: string, payerTelegramId: string): { kind: "plus" } | { kind: "plan"; planId: string } | null {
  if (payload === "plus") return { kind: "plus" };
  const parts = payload.split(":");
  if (parts.length !== 3 || parts[0] !== "plan" || !parts[1] || parts[2] !== payerTelegramId) return null;
  return { kind: "plan", planId: parts[1] };
}

export function parseChainNonce(value: string): bigint | null {
  if (!/^[0-9]{1,20}$/.test(value)) return null;
  const nonce = BigInt(value);
  if (nonce <= 0n || nonce >= 1n << 64n) return null;
  return nonce;
}
