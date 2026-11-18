export function preCheckoutDecision(currency: string, payload: string): { ok: true } | { ok: false; error: string } {
  if (currency !== "XTR") return { ok: false, error: "SubFlow принимает только Stars" };
  if (payload === "plus") return { ok: true };
  const parts = payload.split(":");
  if (parts.length === 3 && parts[0] === "plan" && parts[1].length > 0 && /^[0-9]+$/.test(parts[2])) return { ok: true };
  return { ok: false, error: "Этот счёт не относится к SubFlow" };
}
