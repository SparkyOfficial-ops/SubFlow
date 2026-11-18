import { BadRequestException, Body, Controller, Get, Headers, NotFoundException, Param, Post, UnauthorizedException } from "@nestjs/common";
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { CurrentUser } from "./http.controller";
import { PrismaService } from "./prisma.service";

class SplitMemberDto {
  @IsString() id!: string;
  @IsString() name!: string;
  @IsNumber() share!: number;
  @IsIn(["paid", "pending"]) status!: "paid" | "pending";
  @IsOptional() @IsBoolean() isSelf?: boolean;
}

class SplitDto {
  @IsString() id!: string;
  @IsString() subscriptionId!: string;
  @IsOptional() @IsString() organizerAddress?: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SplitMemberDto)
  members!: SplitMemberDto[];
}

@Controller("plans")
export class PlansController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(":id")
  async one(@Param("id") id: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id }, include: { owner: true } });
    if (!plan) throw new NotFoundException();
    return {
      id: plan.id,
      title: plan.title,
      amount: Number(plan.amount),
      currency: plan.currency,
      period: plan.period,
      chainNonce: plan.chainNonce.toString(),
      ownerWallet: plan.owner.walletAddress,
    };
  }
}

@Controller("splits")
export class SplitsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly current: CurrentUser,
  ) {}

  @Get()
  async list(@Headers("authorization") authorization?: string) {
    const user = await this.current.from(authorization);
    const rows = await this.prisma.splitPool.findMany({
      where: { ownerId: user.id },
      include: { members: true, subscription: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(serializeSplit);
  }

  @Get(":id")
  async one(@Param("id") id: string) {
    const row = await this.prisma.splitPool.findUnique({ where: { id }, include: { members: true, subscription: true } });
    if (!row) throw new NotFoundException();
    return serializeSplit(row);
  }

  @Post()
  async save(@Headers("authorization") authorization: string | undefined, @Body() body: SplitDto) {
    const user = await this.current.from(authorization);
    const subscription = await this.prisma.subscription.findFirst({ where: { id: body.subscriptionId, userId: user.id } });
    if (!subscription) throw new UnauthorizedException();
    if (!body.members.length || body.members.length > 12) throw new BadRequestException("members");
    const members = body.members.map((member) => ({
      id: member.id,
      name: member.name.slice(0, 80),
      share: member.share,
      status: member.status,
      isSelf: Boolean(member.isSelf),
    }));
    const existing = await this.prisma.splitPool.findUnique({ where: { id: body.id } });
    if (existing && existing.ownerId !== user.id) throw new UnauthorizedException();
    if (existing) {
      await this.prisma.splitMember.deleteMany({ where: { poolId: existing.id } });
      const saved = await this.prisma.splitPool.update({
        where: { id: existing.id },
        data: {
          organizerAddress: body.organizerAddress,
          title: subscription.name,
          amount: subscription.amount,
          currency: subscription.currency,
          members: { create: members },
        },
        include: { members: true, subscription: true },
      });
      return serializeSplit(saved);
    }
    const saved = await this.prisma.splitPool.create({
      data: {
        id: body.id,
        subscriptionId: subscription.id,
        ownerId: user.id,
        organizerAddress: body.organizerAddress,
        title: subscription.name,
        amount: subscription.amount,
        currency: subscription.currency,
        members: { create: members },
      },
      include: { members: true, subscription: true },
    });
    return serializeSplit(saved);
  }

  @Post(":id/members/:memberId/paid")
  async paid(@Param("id") id: string, @Param("memberId") memberId: string, @Headers("authorization") authorization?: string) {
    await this.current.from(authorization);
    const member = await this.prisma.splitMember.findFirst({ where: { id: memberId, poolId: id } });
    if (!member) throw new NotFoundException();
    await this.prisma.splitMember.update({ where: { id: member.id }, data: { status: "paid" } });
    const row = await this.prisma.splitPool.findUnique({ where: { id }, include: { members: true, subscription: true } });
    return serializeSplit(row!);
  }
}

@Controller("merchant")
export class MerchantController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("memberships")
  async memberships(@Headers("authorization") authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, "");
    if (!token?.startsWith("sf_")) throw new UnauthorizedException();
    const key = await this.prisma.merchantKey.findUnique({ where: { apiKey: token } });
    if (!key) throw new UnauthorizedException();
    const rows = await this.prisma.membership.findMany({
      where: { plan: { ownerId: key.userId } },
      include: { plan: true, user: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return rows.map((row) => ({
      id: row.id,
      planId: row.planId,
      planTitle: row.plan.title,
      status: row.status,
      expiresAt: row.expiresAt?.toISOString() ?? null,
      telegramId: row.user.telegramId.toString(),
    }));
  }
}

function serializeSplit(row: {
  id: string;
  subscriptionId: string;
  organizerAddress: string | null;
  title: string;
  amount: { toString(): string };
  currency: string;
  subscription?: { color: string } | null;
  members: { id: string; name: string; share: { toString(): string }; status: string; isSelf: boolean }[];
}) {
  return {
    id: row.id,
    subscriptionId: row.subscriptionId,
    organizerAddress: row.organizerAddress,
    title: row.title,
    amount: Number(row.amount),
    currency: row.currency,
    color: row.subscription?.color ?? "#5b6b7c",
    members: row.members.map((member) => ({
      id: member.id,
      name: member.name,
      share: Number(member.share),
      status: member.status,
      isSelf: member.isSelf,
    })),
  };
}
