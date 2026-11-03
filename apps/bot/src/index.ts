import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Bot, InlineKeyboard } from "grammy";

function loadEnv(): void {
  for (const file of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index <= 0) continue;
      const key = trimmed.slice(0, index).trim();
      if (!process.env[key]) process.env[key] = trimmed.slice(index + 1).trim();
    }
  }
}

async function reportStars(payload: string, chargeId: string, telegramId: number, amount: number) {
  const base = process.env.API_URL ?? "http://localhost:3000";
  const secret = process.env.INTERNAL_SECRET;
  if (!secret) return;
  await fetch(`${base.replace(/\/$/, "")}/internal/stars`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-internal-secret": secret },
    body: JSON.stringify({ payload, chargeId, telegramId: String(telegramId), amount }),
  });
}

