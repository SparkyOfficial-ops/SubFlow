import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Bot, InlineKeyboard } from "grammy";
import { preCheckoutDecision } from "./payments";

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

async function reportStars(payload: string, chargeId: string, telegramId: number, amount: number): Promise<boolean> {
  const base = process.env.API_URL ?? "http://localhost:3000";
  const secret = process.env.INTERNAL_SECRET;
  if (!secret) return false;
  const response = await fetch(`${base.replace(/\/$/, "")}/internal/stars`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-internal-secret": secret },
    body: JSON.stringify({ payload, chargeId, telegramId: String(telegramId), amount }),
  });
  if (!response.ok) return false;
  const body = (await response.json().catch(() => null)) as { status?: string } | null;
  return body?.status === "confirmed";
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

  bot.command("paysupport", async (ctx) => {
    const ru = ctx.from?.language_code?.startsWith("ru");
    await ctx.reply(
      ru
        ? "Если Stars списались, а доступ не открылся, пришлите сюда время оплаты и название тарифа. Повторно ничего не списываем, пока платёж не записан."
        : "If Stars were charged and access did not open, send the payment time and the plan name here. We do not charge again until the payment is recorded.",
    );
  });

  bot.on("pre_checkout_query", async (ctx) => {
    const decision = preCheckoutDecision(ctx.preCheckoutQuery.currency, ctx.preCheckoutQuery.invoice_payload);
    await ctx.answerPreCheckoutQuery(decision.ok, decision.ok ? undefined : decision.error);
  });

  bot.on("message:successful_payment", async (ctx) => {
    const payment = ctx.message.successful_payment;
    if (!payment || !ctx.from) return;
    const saved = await reportStars(payment.invoice_payload, payment.telegram_payment_charge_id, ctx.from.id, payment.total_amount);
    const ru = ctx.from.language_code?.startsWith("ru");
    if (!saved) {
      await ctx.reply(ru ? "Telegram принял оплату, но доступ ещё не записан. Напишите /paysupport, повторно ничего не списываем." : "Telegram accepted the payment, but access is not recorded yet. Send /paysupport. Nothing is charged again.");
      return;
    }
    await ctx.reply(ru ? "Оплата получена. Если это доступ в канал, ссылка придёт следующим сообщением." : "Payment received. A channel invite follows if this plan includes one.");
  });

  bot.catch((error) => console.error(error));
  await bot.start();
  console.log("SubFlow bot is running");
}

void main();
