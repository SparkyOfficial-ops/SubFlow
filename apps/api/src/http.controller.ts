import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Injectable,
  Param,
  Patch,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";
import { FREE_SUBSCRIPTION_LIMIT, PLAN_PERIODS, type PlanPeriod } from "@subflow/shared";
import { PaymentsService } from "./payments.service";
import { verifyInitData } from "./telegram-auth";
import { PrismaService } from "./prisma.service";
import { readSession, signSession } from "./token";

class TelegramAuthDto {
  @IsString()
  @IsNotEmpty()
  initData!: string;
}

class SubscriptionDto {
  @IsString() id!: string;
  @IsString() name!: string;
  @IsString() emoji!: string;
  @IsString() color!: string;
  @IsNumber() amount!: number;
  @IsString() currency!: string;
  @IsString() period!: string;
  @IsOptional() @IsInt() customDays?: number;
  @IsString() nextChargeAt!: string;
  @IsString() paymentMethod!: string;
  @IsString() category!: string;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsBoolean() isTrial?: boolean;
  @IsOptional() @IsString() trialEndsAt?: string;
  @IsOptional() @IsString() templateId?: string;
  @IsOptional() @IsString() status?: string;
}

class PatchSubscriptionDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() nextChargeAt?: string;
  @IsOptional() @IsString() note?: string;
}

class PlanDto {
  @IsString() id!: string;
  @IsString() title!: string;
  @IsNumber() amount!: number;
  @IsIn(["TON", "USDT", "STARS"]) currency!: "TON" | "USDT" | "STARS";
  @IsIn(PLAN_PERIODS) period!: PlanPeriod;
  @IsOptional() @IsString() chatId?: string;
}

class InvoiceDto {
  @IsString() id!: string;
  @IsString() title!: string;
  @IsInt() @Min(1) @Max(100000) amount!: number;
}

class ChainDto {
  @IsString() comment!: string;
  @IsIn(["TON", "USDT"]) currency!: "TON" | "USDT";
}

class StarsDto {
  @IsString() payload!: string;
  @IsString() chargeId!: string;
  @IsString() telegramId!: string;
  @IsInt() amount!: number;
}

class WebhookDto {
  @IsOptional() @IsString() webhookUrl?: string;
}

@Injectable()
export class CurrentUser {
  constructor(private readonly prisma: PrismaService) {}

  async from(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, "");
    if (!token) throw new UnauthorizedException();
    const session = readSession(token);
    if (!session) throw new UnauthorizedException();
    const user = await this.prisma.user.findUnique({ where: { id: session.sub } });
    if (!user) throw new UnauthorizedException();
    return user;
  }
}

@Controller()
export class HealthController {
  @Get("health")
  health() {
    return { ok: true, service: "subflow-api" };
  }
}

@Controller("auth")
export class AuthController {
  constructor(private readonly prisma: PrismaService) {}

  @Post("telegram")
  async telegram(@Body() body: TelegramAuthDto) {
    const token = process.env.BOT_TOKEN;
    if (!token) throw new BadRequestException("BOT_TOKEN is not configured");
    const verified = verifyInitData(body.initData, token);
    if (!verified) throw new UnauthorizedException("Invalid initData");
    const user = await this.prisma.user.upsert({
      where: { telegramId: BigInt(verified.user.id) },
      create: {
