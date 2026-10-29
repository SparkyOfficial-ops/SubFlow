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
        telegramId: BigInt(verified.user.id),
        firstName: verified.user.first_name,
        lastName: verified.user.last_name,
        username: verified.user.username,
        language: verified.user.language_code ?? "en",
      },
      update: {
        firstName: verified.user.first_name,
        lastName: verified.user.last_name,
        username: verified.user.username,
        language: verified.user.language_code ?? "en",
      },
    });
    return {
      token: signSession(user.id, user.telegramId.toString()),
      user: { id: user.id, firstName: user.firstName, language: user.language },
    };
  }
}

@Controller("subscriptions")
export class SubscriptionsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly current: CurrentUser,
  ) {}

  @Get()
  async list(@Headers("authorization") authorization?: string) {
    const user = await this.current.from(authorization);
    const rows = await this.prisma.subscription.findMany({ where: { userId: user.id }, orderBy: { nextChargeAt: "asc" } });
    return rows.map(serializeSubscription);
  }

  @Post()
  async save(@Headers("authorization") authorization: string | undefined, @Body() body: SubscriptionDto) {
    const user = await this.current.from(authorization);
    const clash = await this.prisma.subscription.findUnique({ where: { id: body.id } });
    if (clash && clash.userId !== user.id) throw new UnauthorizedException();
    const existing = clash;
    const plus = user.plusUntil && user.plusUntil > new Date();
    if (!existing && !plus) {
      const used = await this.prisma.subscription.count({ where: { userId: user.id, status: { not: "cancelled" } } });
      if (used >= FREE_SUBSCRIPTION_LIMIT) throw new BadRequestException("Free plan limit reached");
    }
    const data = {
      name: body.name,
      emoji: body.emoji,
      color: body.color,
      amount: body.amount,
      currency: body.currency,
      period: body.period,
      customDays: body.customDays,
      nextChargeAt: new Date(body.nextChargeAt),
      paymentMethod: body.paymentMethod,
      category: body.category,
      note: body.note,
      isTrial: Boolean(body.isTrial),
      trialEndsAt: body.trialEndsAt ? new Date(body.trialEndsAt) : null,
      templateId: body.templateId,
      status: body.status ?? "active",
    };
    const row = existing
      ? await this.prisma.subscription.update({ where: { id: existing.id }, data })
      : await this.prisma.subscription.create({ data: { ...data, id: body.id, userId: user.id } });
    return serializeSubscription(row);
  }

  @Patch(":id")
  async patch(@Param("id") id: string, @Headers("authorization") authorization: string | undefined, @Body() body: PatchSubscriptionDto) {
    const user = await this.current.from(authorization);
    const owned = await this.prisma.subscription.findFirst({ where: { id, userId: user.id } });
    if (!owned) throw new UnauthorizedException();
    const row = await this.prisma.subscription.update({
      where: { id },
      data: {
        status: body.status,
        nextChargeAt: body.nextChargeAt ? new Date(body.nextChargeAt) : undefined,
        note: body.note,
      },
    });
    return serializeSubscription(row);
  }

  @Delete(":id")
  async remove(@Param("id") id: string, @Headers("authorization") authorization?: string) {
    const user = await this.current.from(authorization);
    await this.prisma.subscription.deleteMany({ where: { id, userId: user.id } });
    return { ok: true };
  }
}

@Controller("creators")
export class CreatorsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly current: CurrentUser,
    private readonly payments: PaymentsService,
  ) {}

  @Get("plans")
  async plans(@Headers("authorization") authorization?: string) {
    const user = await this.current.from(authorization);
    return this.prisma.plan.findMany({ where: { ownerId: user.id }, orderBy: { createdAt: "desc" } });
  }

  @Post("plans")
  async save(@Headers("authorization") authorization: string | undefined, @Body() body: PlanDto) {
    const user = await this.current.from(authorization);
    const existing = await this.prisma.plan.findUnique({ where: { id: body.id } });
    if (existing && existing.ownerId !== user.id) throw new UnauthorizedException();
    return this.prisma.plan.upsert({
      where: { id: body.id },
      create: { ...body, ownerId: user.id },
      update: { title: body.title, amount: body.amount, currency: body.currency, period: body.period, chatId: body.chatId },
    });
  }

  @Get("analytics")
  async analytics(@Headers("authorization") authorization?: string) {
    const user = await this.current.from(authorization);
    return this.payments.analytics(user.id);
  }

  @Post("keys")
  async key(@Headers("authorization") authorization: string | undefined, @Body() body: WebhookDto) {
    const user = await this.current.from(authorization);
    const key = await this.payments.ensureMerchantKey(user.id, body.webhookUrl);
    return { apiKey: key.apiKey, webhookSecret: key.webhookSecret, webhookUrl: key.webhookUrl };
  }

  @Post("invoices")
  async invoice(@Headers("authorization") authorization: string | undefined, @Body() body: InvoiceDto) {
    const user = await this.current.from(authorization);
    if (body.id === "plus") {
      if (body.amount !== 100) throw new BadRequestException("Amount mismatch");
      return { url: await this.payments.invoiceLink("SubFlow Plus", "plus", 100) };
    }
    const plan = await this.prisma.plan.findUnique({ where: { id: body.id } });
    if (!plan || plan.currency !== "STARS" || Number(plan.amount) !== body.amount) throw new BadRequestException("Unknown plan");
    const url = await this.payments.invoiceLink(plan.title, `plan:${plan.id}:${user.telegramId.toString()}`, Number(plan.amount));
    return { url };
  }
}

@Controller("payments")
export class PaymentsController {
  constructor(
    private readonly current: CurrentUser,
    private readonly payments: PaymentsService,
  ) {}

  @Post("chain")
  async chain(@Headers("authorization") authorization: string | undefined, @Body() body: ChainDto) {
    const user = await this.current.from(authorization);
    return this.payments.confirmChain(user.id, body.comment, body.currency);
  }
}

@Controller("internal")
export class InternalController {
  constructor(private readonly payments: PaymentsService) {}

  @Post("stars")
  async stars(@Headers("x-internal-secret") secret: string | undefined, @Body() body: StarsDto) {
    if (!process.env.INTERNAL_SECRET || secret !== process.env.INTERNAL_SECRET) throw new UnauthorizedException();
    return this.payments.confirmStars(body);
  }
}

function serializeSubscription(row: {
  id: string;
  name: string;
  emoji: string;
  color: string;
  amount: { toString(): string };
  currency: string;
  period: string;
  customDays: number | null;
  nextChargeAt: Date;
  paymentMethod: string;
  category: string;
  status: string;
  note: string | null;
  isTrial: boolean;
  trialEndsAt: Date | null;
  templateId: string | null;
}) {
  return {
    ...row,
    amount: Number(row.amount),
    nextChargeAt: row.nextChargeAt.toISOString(),
    trialEndsAt: row.trialEndsAt?.toISOString() ?? null,
  };
}
