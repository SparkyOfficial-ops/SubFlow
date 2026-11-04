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

async function main() {
  loadEnv();
  const token = process.env.BOT_TOKEN;
  if (!token) {
    console.error("Set BOT_TOKEN in .env before starting the bot.");
    process.exit(1);
  }
  const bot = new Bot(token);
  const webApp = process.env.WEBAPP_URL;

  bot.command("start", async (ctx) => {
    const keyboard = new InlineKeyboard();
    if (webApp) keyboard.webApp("SubFlow", webApp);
    const ru = ctx.from?.language_code?.startsWith("ru");
    await ctx.reply(
      ru
        ? "SubFlow собирает подписки и принимает оплату канала в TON, USDT и Stars."
        : "SubFlow tracks your subscriptions and charges for a channel in TON, USDT and Stars.",
      webApp ? { reply_markup: keyboard } : undefined,
    );
  });

  bot.on("message:successful_payment", async (ctx) => {
    const payment = ctx.message.successful_payment;
    if (!payment || !ctx.from) return;
    await reportStars(payment.invoice_payload, payment.telegram_payment_charge_id, ctx.from.id, payment.total_amount);
    const ru = ctx.from.language_code?.startsWith("ru");
    await ctx.reply(ru ? "Оплата получена. Если это доступ в канал, ссылка придёт следующим сообщением." : "Payment received. A channel invite follows if this plan includes one.");
  });

  bot.catch((error) => console.error(error));
  await bot.start();
  console.log("SubFlow bot is running");
}

void main();
