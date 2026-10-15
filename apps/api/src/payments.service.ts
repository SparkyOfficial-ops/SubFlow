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
