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
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";
import Redis from "ioredis";
import { DISPLAY_CURRENCIES, FREE_SUBSCRIPTION_LIMIT, PLAN_PERIODS, newChainNonce, type DisplayCurrency, type PlanPeriod } from "@subflow/shared";
import { PaymentsService } from "./payments.service";
import { PrismaService } from "./prisma.service";
import { parseChainNonce } from "./rules";
import { verifyInitData } from "./telegram-auth";
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
  @IsOptional() @IsString() chainNonce?: string;
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
  @IsOptional() @IsString() chainNonce?: string;
}

class InvoiceDto {
  @IsString() id!: string;
  @IsString() title!: string;
  @IsInt() @Min(1) @Max(100000) amount!: number;
}

class ChainDto {
  @IsString() boc!: string;
  @IsIn(["TON", "USDT"]) currency!: "TON" | "USDT";
  @IsString() chainNonce!: string;
  @IsIn(["plan", "subscription"]) kind!: "plan" | "subscription";
}

class ProfileDto {
  @IsOptional() @IsIn(DISPLAY_CURRENCIES) displayCurrency?: DisplayCurrency;
  @IsOptional() @IsArray() @IsInt({ each: true }) notifyDays?: number[];
  @IsOptional() @IsString() walletAddress?: string;
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
  constructor(private readonly prisma: PrismaService) {}

  @Get("health")
  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException("database");
    }
    let redis: "up" | "down" | "skipped" = "skipped";
    if (process.env.REDIS_URL) {
      const client = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1, connectTimeout: 1500, enableOfflineQueue: false });
      try {
        redis = (await client.ping()) === "PONG" ? "up" : "down";
      } catch {
        redis = "down";
      } finally {
        client.disconnect();
      }
      if (redis !== "up") throw new ServiceUnavailableException("redis");
    }
    return { ok: true, service: "subflow-api", db: "up", redis };
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
    return { token: signSession(user.id, user.telegramId.toString()), user: publicUser(user) };
  }

  @Get("me")
  async me(@Headers("authorization") authorization?: string) {
    const user = await this.userFrom(authorization);
    return publicUser(user);
  }

  @Patch("me")
  async update(@Headers("authorization") authorization: string | undefined, @Body() body: ProfileDto) {
    const user = await this.userFrom(authorization);
    if (body.notifyDays && (body.notifyDays.length === 0 || body.notifyDays.length > 7 || body.notifyDays.some((day) => day < 1 || day > 30))) {
      throw new BadRequestException("notifyDays");
    }
    const saved = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        displayCurrency: body.displayCurrency,
        notifyDays: body.notifyDays,
        walletAddress: body.walletAddress === undefined ? undefined : body.walletAddress || null,
      },
    });
    return publicUser(saved);
  }

  private async userFrom(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, "");
    if (!token) throw new UnauthorizedException();
    const session = readSession(token);
    if (!session) throw new UnauthorizedException();
    const user = await this.prisma.user.findUnique({ where: { id: session.sub } });
    if (!user) throw new UnauthorizedException();
    return user;
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
    const chainNonce = existing?.chainNonce ?? nonceOrNew(body.chainNonce);
    const row = existing
      ? await this.prisma.subscription.update({ where: { id: existing.id }, data })
      : await this.prisma.subscription.create({ data: { ...data, id: body.id, userId: user.id, chainNonce } });
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
    return this.prisma.plan.findMany({ where: { ownerId: user.id }, orderBy: { createdAt: "desc" } }).then((rows) => rows.map(serializePlan));
  }

  @Post("plans")
  async save(@Headers("authorization") authorization: string | undefined, @Body() body: PlanDto) {
    const user = await this.current.from(authorization);
    const existing = await this.prisma.plan.findUnique({ where: { id: body.id } });
    if (existing && existing.ownerId !== user.id) throw new UnauthorizedException();
    const chainNonce = existing?.chainNonce ?? nonceOrNew(body.chainNonce);
    const saved = await this.prisma.plan.upsert({
      where: { id: body.id },
      create: { id: body.id, ownerId: user.id, title: body.title, amount: body.amount, currency: body.currency, period: body.period, chatId: body.chatId, chainNonce },
      update: { title: body.title, amount: body.amount, currency: body.currency, period: body.period, chatId: body.chatId },
    });
    return serializePlan(saved);
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
    return this.payments.submitChain(user.id, body);
  }

  @Get(":id")
  async status(@Param("id") id: string, @Headers("authorization") authorization?: string) {
    const user = await this.current.from(authorization);
    return this.payments.paymentStatus(user.id, id);
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
  chainNonce: bigint;
}) {
  return {
    ...row,
    amount: Number(row.amount),
    chainNonce: row.chainNonce.toString(),
    nextChargeAt: row.nextChargeAt.toISOString(),
    trialEndsAt: row.trialEndsAt?.toISOString() ?? null,
  };
}

function serializePlan(row: {
  id: string;
  title: string;
  amount: { toString(): string };
  currency: string;
  period: string;
  chatId: string | null;
  chainNonce: bigint;
}) {
  return {
    id: row.id,
    title: row.title,
    amount: Number(row.amount),
    currency: row.currency,
    period: row.period,
    chatId: row.chatId,
    chainNonce: row.chainNonce.toString(),
  };
}

function publicUser(user: {
  id: string;
  firstName: string;
  language: string;
  displayCurrency: string;
  notifyDays: number[];
  walletAddress: string | null;
  plusUntil: Date | null;
  telegramId: bigint;
}) {
  return {
    id: user.id,
    firstName: user.firstName,
    language: user.language,
    displayCurrency: user.displayCurrency,
    notifyDays: user.notifyDays,
    walletAddress: user.walletAddress,
    plusUntil: user.plusUntil?.toISOString() ?? null,
    telegramId: user.telegramId.toString(),
  };
}

function nonceOrNew(value?: string): bigint {
  if (!value) return BigInt(newChainNonce());
  const parsed = parseChainNonce(value);
  if (!parsed) throw new BadRequestException("chainNonce");
  return parsed;
}
