import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Queue, Worker } from "bullmq";
import { GRACE_HOURS } from "@subflow/shared";
import { PrismaService } from "./prisma.service";
import { PaymentsService } from "./payments.service";

@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);
  private timer?: NodeJS.Timeout;
  private worker?: Worker;
  private queue?: Queue;
