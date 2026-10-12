import { createHmac, timingSafeEqual } from "node:crypto";

export interface TelegramWebUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface VerifiedInitData {
  user: TelegramWebUser;
  authDate: number;
  startParam?: string;
}

/**
 * Проверка подписи Telegram initData: HMAC-SHA256.
 * Ключ — HMAC("WebAppData", bot token). В строку входят все поля, кроме hash.
 */
export function verifyInitData(
  initData: string,
  botToken: string,
  nowSec = Date.now() / 1000,
  maxAgeSec = 24 * 60 * 60,
): VerifiedInitData | null {
  if (!initData || !botToken) return null;
  const fields = new Map<string, string>();
  for (const part of initData.split("&")) {
    const index = part.indexOf("=");
    if (index <= 0) continue;
    fields.set(decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1)));
  }
  const hash = fields.get("hash");
  if (!hash) return null;
  fields.delete("hash");
  const dataCheckString = [...fields.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const computed = createHmac("sha256", secret).update(dataCheckString).digest("hex");
  const actual = Buffer.from(computed, "hex");
  const expected = Buffer.from(hash, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  const authDate = Number(fields.get("auth_date") ?? 0);
  if (!Number.isFinite(authDate) || authDate <= 0 || nowSec - authDate > maxAgeSec) return null;
  const rawUser = fields.get("user");
  if (!rawUser) return null;
  let user: TelegramWebUser;
  try {
    user = JSON.parse(rawUser) as TelegramWebUser;
  } catch {
    return null;
  }
  if (!user?.id || !user.first_name) return null;
  return { user, authDate, startParam: fields.get("start_param") || undefined };
}
