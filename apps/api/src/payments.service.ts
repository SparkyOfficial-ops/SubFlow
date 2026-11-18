import { createHmac, randomBytes } from "node:crypto";
import { BadRequestException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { addPeriod, externalMessageHash, monthlyEquivalent, planDurationDays, type SubPeriod } from "@subflow/shared";
import { toNano } from "@ton/core";
import { PrismaService } from "./prisma.service";
import { parseChainNonce, starsTarget } from "./rules";
import { fetchMessageTransaction, officialUsdtWallet, paymentMatches } from "./ton";

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

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

  async submitChain(userId: string, input: { boc: string; currency: "TON" | "USDT"; chainNonce: string; kind: "plan" | "subscription" }) {
    const nonce = parseChainNonce(input.chainNonce);
    if (!nonce) throw new BadRequestException("chainNonce");
    let messageHash: string;
    try {
      messageHash = externalMessageHash(input.boc);
    } catch {
      throw new BadRequestException("boc");
    }
    const plan = input.kind === "plan" ? await this.prisma.plan.findFirst({ where: { chainNonce: nonce }, include: { owner: true } }) : null;
    if (input.kind === "plan" && (!plan || plan.currency !== input.currency)) throw new BadRequestException("Unknown plan");
    if (plan && !plan.owner.walletAddress) throw new BadRequestException("Merchant wallet is not set");
    const subscription = input.kind === "subscription"
      ? await this.prisma.subscription.findFirst({ where: { chainNonce: nonce, userId } })
      : null;
    if (input.kind === "subscription" && (!subscription || subscription.currency !== input.currency)) throw new BadRequestException("Unknown subscription");
    const existing = await this.prisma.payment.findUnique({ where: { messageHash } });
    if (existing?.status === "confirmed") return { id: existing.id, status: "confirmed" as const, txHash: existing.txHash };
    if (existing && existing.userId !== userId) throw new UnauthorizedException();
    const payment = existing ?? await this.prisma.payment.create({
      data: {
        messageHash,
        boc: input.boc.slice(0, 12_000),
        provider: input.currency,
        userId,
        planId: plan?.id,
        chainNonce: nonce,
        comment: `${input.kind}:${nonce.toString()}`,
        amount: plan?.amount ?? subscription?.amount,
        currency: input.currency,
        status: "pending",
        nextCheckAt: new Date(),
      },
    });
    return this.trySettle(payment.id);
  }

  async paymentStatus(userId: string, id: string) {
    const row = await this.prisma.payment.findFirst({ where: { id, userId } });
    if (!row) throw new UnauthorizedException();
    if (row.status === "pending") return this.trySettle(row.id);
    return { id: row.id, status: row.status, txHash: row.txHash };
  }

  async settleDue(): Promise<void> {
    const due = await this.prisma.payment.findMany({
      where: {
        status: "pending",
        attempts: { lt: 40 },
        OR: [{ nextCheckAt: null }, { nextCheckAt: { lte: new Date() } }],
      },
      take: 25,
    });
    for (const row of due) {
      await this.trySettle(row.id).catch((error: unknown) => this.logger.warn(String(error)));
    }
  }

  async trySettle(id: string) {
    const row = await this.prisma.payment.findUnique({ where: { id } });
    if (!row) return { id, status: "missing" as const };
    if (row.status !== "pending" || !row.messageHash || !row.chainNonce || !row.userId || (row.currency !== "TON" && row.currency !== "USDT")) {
      return { id: row.id, status: row.status, txHash: row.txHash };
    }
    const user = await this.prisma.user.findUnique({ where: { id: row.userId } });
    const router = process.env.ROUTER_ADDRESS;
    if (!user || !router) return { id: row.id, status: "pending" as const };
    const tx = await fetchMessageTransaction(row.messageHash);
    if (!tx) return this.defer(row.id);
    const plan = row.planId ? await this.prisma.plan.findUnique({ where: { id: row.planId }, include: { owner: true } }) : null;
    const minUnits = row.currency === "TON" ? toNano((row.amount ?? 0).toString()) : BigInt(Math.round(Number(row.amount ?? 0) * 1_000_000));
    const usdtWallet = row.currency === "USDT" && tx.account?.address ? await officialUsdtWallet(tx.account.address) : undefined;
    if (row.currency === "USDT" && !usdtWallet) return this.defer(row.id);
    const matched = paymentMatches(tx, {
      currency: row.currency,
      router,
      chainNonce: row.chainNonce,
      telegramId: user.telegramId,
      minUnits,
      merchant: plan?.owner.walletAddress ?? undefined,
      usdtWallet: usdtWallet ?? undefined,
    });
    if (!matched) return row.attempts < 4 ? this.defer(row.id) : this.reject(row.id);
    const hash = tx.hash ?? row.messageHash;
    await this.prisma.payment.update({ where: { id: row.id }, data: { status: "confirmed", txHash: hash, attempts: { increment: 1 } } });
    if (plan) await this.grant(plan.id, user.id, hash, false);
    else await this.bumpSubscription(row.chainNonce, user.id);
    return { id: row.id, status: "confirmed" as const, txHash: hash };
  }

  private async defer(id: string) {
    await this.prisma.payment.update({
      where: { id },
      data: { attempts: { increment: 1 }, nextCheckAt: new Date(Date.now() + 15_000) },
    });
    return { id, status: "pending" as const };
  }

  private async reject(id: string) {
    await this.prisma.payment.update({ where: { id }, data: { status: "rejected", attempts: { increment: 1 } } });
    return { id, status: "rejected" as const };
  }

  private async bumpSubscription(chainNonce: bigint, userId: string) {
    const sub = await this.prisma.subscription.findFirst({ where: { chainNonce, userId } });
    if (!sub) return;
    const base = sub.nextChargeAt > new Date() ? sub.nextChargeAt : new Date();
    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "active", nextChargeAt: addPeriod(base, sub.period as SubPeriod, sub.customDays), isTrial: false },
    });
  }

  async confirmStars(input: { payload: string; chargeId: string; telegramId: string; amount: number }) {
    const existing = await this.prisma.payment.findUnique({ where: { txHash: input.chargeId } });
    if (existing) return { status: "confirmed" as const };
    const user = await this.prisma.user.findUnique({ where: { telegramId: BigInt(input.telegramId) } });
    if (!user) throw new UnauthorizedException();
    const target = starsTarget(input.payload, input.telegramId);
    if (!target) throw new BadRequestException("Invoice does not match the payer");
    if (target.kind === "plus") {
      await this.prisma.payment.create({
        data: { txHash: input.chargeId, provider: "STARS", userId: user.id, comment: "plus", amount: input.amount, currency: "STARS", status: "confirmed" },
      });
      await this.prisma.user.update({ where: { id: user.id }, data: { plusUntil: addPeriod(new Date(), "month") } });
      return { status: "confirmed" as const };
    }
    const plan = await this.prisma.plan.findUnique({ where: { id: target.planId } });
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
    if (!key?.webhookUrl) return;
    const body = JSON.stringify({ event, data, sentAt: new Date().toISOString() });
    const signature = createHmac("sha256", key.webhookSecret).update(body).digest("hex");
    await fetch(key.webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json", "x-subflow-signature": signature },
      body,
    }).catch(() => undefined);
  }
}
