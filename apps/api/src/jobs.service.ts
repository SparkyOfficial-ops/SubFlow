import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Queue, Worker } from "bullmq";
import { GRACE_HOURS } from "@subflow/shared";
import { graceDeadline } from "./rules";
import { PrismaService } from "./prisma.service";
import { PaymentsService } from "./payments.service";

@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);
  private timer?: NodeJS.Timeout;
  private worker?: Worker;
  private queue?: Queue;

  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
  ) {}

  async onModuleInit(): Promise<void> {
    const queued = await this.startQueue();
    if (!queued) this.timer = setInterval(() => void this.tick(), 60_000);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    await this.worker?.close();
    await this.queue?.close();
  }

  private async startQueue(): Promise<boolean> {
    const url = process.env.REDIS_URL;
    if (!url) return false;
    try {
      const parsed = new URL(url);
      const connection = { host: parsed.hostname, port: Number(parsed.port || 6379), password: parsed.password || undefined, maxRetriesPerRequest: null };
      this.queue = new Queue("subflow", { connection });
      await this.queue.add("tick", {}, { repeat: { every: 60_000 }, jobId: "subflow-tick" });
      this.worker = new Worker("subflow", async () => this.tick(), { connection });
      return true;
    } catch (error) {
      this.logger.warn(`BullMQ is off, using a local timer: ${String(error)}`);
      return false;
    }
  }

  async tick(): Promise<void> {
    await this.payments.settleDue().catch((error: unknown) => this.logger.warn(String(error)));
    await this.remind();
    await this.revoke();
  }

  private async remind(): Promise<void> {
    const soon = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
    const subs = await this.prisma.subscription.findMany({
      where: { status: "active", nextChargeAt: { lte: soon } },
      include: { user: true, reminders: true },
    });
    for (const sub of subs) {
      const target = sub.isTrial && sub.trialEndsAt ? sub.trialEndsAt : sub.nextChargeAt;
      const daysLeft = (target.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
      if (daysLeft < 0) continue;
      const due = [...sub.user.notifyDays].filter((day) => daysLeft <= day).sort((a, b) => b - a);
      for (const day of due) {
        const cycleKey = target.toISOString();
        if (sub.reminders.some((item) => item.daysBefore === day && item.cycleKey === cycleKey)) continue;
        const text = sub.user.language.startsWith("ru")
          ? `${sub.name}: списание через ${day} дн. Откройте SubFlow, чтобы продлить.`
          : `${sub.name}: charge in ${day} days. Open SubFlow to renew.`;
        await this.send(sub.user.telegramId.toString(), text);
        await this.prisma.reminder.create({ data: { subscriptionId: sub.id, daysBefore: day, cycleKey } });
        break;
      }
    }
  }

  private async revoke(): Promise<void> {
    const deadline = graceDeadline(new Date(), GRACE_HOURS);
    const rows = await this.prisma.membership.findMany({
      where: { status: "active", expiresAt: { lt: deadline }, kickedAt: null },
      include: { plan: true, user: true },
    });
    const token = process.env.BOT_TOKEN;
    for (const row of rows) {
      if (token && row.plan.chatId) {
        await fetch(`https://api.telegram.org/bot${token}/banChatMember`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ chat_id: row.plan.chatId, user_id: Number(row.user.telegramId) }),
        });
        await fetch(`https://api.telegram.org/bot${token}/unbanChatMember`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ chat_id: row.plan.chatId, user_id: Number(row.user.telegramId), only_if_banned: true }),
        });
      }
      await this.prisma.membership.update({ where: { id: row.id }, data: { status: "expired", kickedAt: new Date() } });
      await this.payments.expireNotice(row.plan.ownerId, { planId: row.planId, userId: row.userId });
    }
  }

  private async send(chatId: string, text: string): Promise<void> {
    const token = process.env.BOT_TOKEN;
    if (!token) return;
    const webApp = process.env.WEBAPP_URL;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        reply_markup: webApp ? { inline_keyboard: [[{ text: "SubFlow", web_app: { url: webApp } }]] } : undefined,
      }),
    });
  }
}
