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
