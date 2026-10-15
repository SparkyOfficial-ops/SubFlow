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
