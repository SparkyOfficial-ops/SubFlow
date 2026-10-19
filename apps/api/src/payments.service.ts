import { createHmac, randomBytes } from "node:crypto";
import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { addPeriod, monthlyEquivalent, planDurationDays } from "@subflow/shared";
import { toNano } from "@ton/core";
import { PrismaService } from "./prisma.service";
import { findRouterTransfer } from "./ton";

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async invoiceLink(title: string, payload: string, stars: number): Promise<string> {
    const token = process.env.BOT_TOKEN;
    if (!token) throw new BadRequestException("BOT_TOKEN is not configured");
    const response = await fetch(`https://api.telegram.org/bot${token}/createInvoiceLink`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: title.slice(0, 32),
        description: "SubFlow",
        payload: payload.slice(0, 128),
        currency: "XTR",
        prices: [{ label: title.slice(0, 32), amount: Math.max(1, Math.round(stars)) }],
      }),
    });
    const body = (await response.json()) as { ok: boolean; result?: string; description?: string };
    if (!body.ok || !body.result) throw new BadRequestException(body.description ?? "invoice failed");
    return body.result;
  }

  async confirmChain(userId: string, comment: string, currency: "TON" | "USDT") {
    const planId = comment.startsWith("plan:") ? comment.slice(5) : undefined;
    const plan = planId ? await this.prisma.plan.findUnique({ where: { id: planId } }) : null;
    if (planId && (!plan || plan.currency !== currency)) throw new BadRequestException("Unknown plan");
    const minUnits = plan ? (currency === "TON" ? toNano(plan.amount.toString()) : BigInt(Math.round(Number(plan.amount) * 1_000_000))) : 1n;
    const found = await findRouterTransfer({ comment, currency, minUnits });
    if (!found) return { status: "pending" as const };
    const existing = await this.prisma.payment.findUnique({ where: { txHash: found.hash } });
    if (existing) return { status: "confirmed" as const, txHash: found.hash };
    await this.prisma.payment.create({
      data: {
        txHash: found.hash,
        provider: currency,
        userId,
        planId: plan?.id,
        comment,
        amount: plan?.amount,
        currency,
        status: "confirmed",
      },
    });
    if (plan) await this.grant(plan.id, userId, found.hash, false);
    return { status: "confirmed" as const, txHash: found.hash };
  }

  async confirmStars(input: { payload: string; chargeId: string; telegramId: string; amount: number }) {
    const existing = await this.prisma.payment.findUnique({ where: { txHash: input.chargeId } });
    if (existing) return { status: "confirmed" as const };
    const user = await this.prisma.user.findUnique({ where: { telegramId: BigInt(input.telegramId) } });
    if (!user) throw new UnauthorizedException();
    if (input.payload === "plus") {
      await this.prisma.payment.create({
        data: { txHash: input.chargeId, provider: "STARS", userId: user.id, comment: "plus", amount: input.amount, currency: "STARS", status: "confirmed" },
      });
      await this.prisma.user.update({ where: { id: user.id }, data: { plusUntil: addPeriod(new Date(), "month") } });
      return { status: "confirmed" as const };
    }
    const planId = input.payload.split(":")[1];
    const plan = planId ? await this.prisma.plan.findUnique({ where: { id: planId } }) : null;
    if (!plan || plan.currency !== "STARS" || Number(plan.amount) !== input.amount) throw new BadRequestException("Invoice does not match the plan");
    await this.prisma.payment.create({
      data: { txHash: input.chargeId, provider: "STARS", userId: user.id, planId: plan.id, comment: input.payload, amount: input.amount, currency: "STARS", status: "confirmed" },
    });
    await this.grant(plan.id, user.id, input.chargeId, false);
    return { status: "confirmed" as const };
  }

  async grant(planId: string, userId: string, reference: string, renewal: boolean) {
    const plan = await this.prisma.plan.findUnique({ where: { id: planId }, include: { owner: true } });
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!plan || !user) return;
    const days = planDurationDays(plan.period as "month" | "quarter" | "forever");
    const current = await this.prisma.membership.findFirst({ where: { planId, userId, status: "active" }, orderBy: { expiresAt: "desc" } });
    const base = current?.expiresAt && current.expiresAt > new Date() ? current.expiresAt : new Date();
    const expiresAt = days ? addPeriod(base, plan.period as "month" | "quarter") : null;
    let inviteLink: string | undefined;
    if (plan.chatId && process.env.BOT_TOKEN) {
      const response = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/createChatInviteLink`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: plan.chatId, member_limit: 1, name: `subflow-${reference.slice(0, 12)}` }),
      });
      const body = (await response.json()) as { ok: boolean; result?: { invite_link?: string } };
      inviteLink = body.result?.invite_link;
      if (inviteLink) {
        await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ chat_id: user.telegramId.toString(), text: inviteLink }),
        });
      }
    }
    if (current) {
      await this.prisma.membership.update({ where: { id: current.id }, data: { expiresAt, inviteLink: inviteLink ?? current.inviteLink, status: "active", kickedAt: null } });
    } else {
      await this.prisma.membership.create({ data: { planId, userId, status: "active", expiresAt, inviteLink } });
    }
    await this.webhook(plan.ownerId, renewal ? "subscription.renewed" : "subscription.created", {
      planId,
      userId,
      telegramId: user.telegramId.toString(),
      expiresAt,
    });
  }

  async analytics(ownerId: string) {
    const rows = await this.prisma.membership.findMany({ where: { plan: { ownerId } }, include: { plan: true } });
    const now = Date.now();
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
    const active = rows.filter((row) => row.status === "active" && (!row.expiresAt || row.expiresAt.getTime() > now));
    const lost = rows.filter((row) => row.status === "expired" && row.kickedAt && row.kickedAt.getTime() > monthAgo);
    const mrr = active.reduce((sum, row) => sum + monthlyEquivalent(Number(row.plan.amount), row.plan.period as "month" | "quarter" | "forever"), 0);
    const churn = active.length + lost.length === 0 ? 0 : lost.length / (active.length + lost.length);
    return { mrr, active: active.length, churn };
  }

  async ensureMerchantKey(userId: string, webhookUrl?: string) {
    const current = await this.prisma.merchantKey.findUnique({ where: { userId } });
    if (current) {
      if (webhookUrl !== undefined) {
        return this.prisma.merchantKey.update({ where: { userId }, data: { webhookUrl: webhookUrl || null } });
      }
      return current;
    }
    return this.prisma.merchantKey.create({
      data: { userId, apiKey: `sf_${randomBytes(24).toString("base64url")}`, webhookSecret: randomBytes(24).toString("base64url"), webhookUrl: webhookUrl || null },
    });
  }

  async expireNotice(ownerId: string, data: object) {
    await this.webhook(ownerId, "subscription.expired", data);
  }

  private async webhook(ownerId: string, event: string, data: object) {
    const key = await this.prisma.merchantKey.findUnique({ where: { userId: ownerId } });
