import { createHmac, timingSafeEqual } from "node:crypto";

interface TokenPayload {
  sub: string;
  tid: string;
  exp: number;
}

function secret(): string {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error("JWT_SECRET is required");
  return value;
}

export function signSession(userId: string, telegramId: string, ttlMs = 30 * 24 * 60 * 60 * 1000): string {
  const body = Buffer.from(JSON.stringify({ sub: userId, tid: telegramId, exp: Date.now() + ttlMs } satisfies TokenPayload)).toString("base64url");
  const signature = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function readSession(token: string): TokenPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as TokenPayload;
    if (!payload.sub || payload.exp < Date.now()) return null;
    return payload;
