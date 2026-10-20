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
      const connection = { host: parsed.hostname, port: Number(parsed.port || 6379), password: parsed.password || undefined, maxRetriesPerRequest: null };
      this.queue = new Queue("subflow", { connection });
      await this.queue.add("tick", {}, { repeat: { every: 60_000 }, jobId: "subflow-tick" });
      this.worker = new Worker("subflow", async () => this.tick(), { connection });
      return true;
    } catch (error) {
      this.logger.warn(`BullMQ is off, using a local timer: ${String(error)}`);
      return false;
    }
  }

  async tick(): Promise<void> {
    await this.remind();
    await this.revoke();
  }

  private async remind(): Promise<void> {
    const soon = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
    const subs = await this.prisma.subscription.findMany({
      where: { status: "active", nextChargeAt: { lte: soon } },
      include: { user: true, reminders: true },
    });
