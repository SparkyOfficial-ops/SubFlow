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

  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
  ) {}

  async onModuleInit(): Promise<void> {
    const queued = await this.startQueue();
    if (!queued) this.timer = setInterval(() => void this.tick(), 60_000);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    await this.worker?.close();
    await this.queue?.close();
  }

  private async startQueue(): Promise<boolean> {
    const url = process.env.REDIS_URL;
    if (!url) return false;
    try {
      const parsed = new URL(url);
