import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { JobsService } from "./jobs.service";
import {
  AuthController,
  CreatorsController,
  CurrentUser,
  HealthController,
  InternalController,
  PaymentsController,
  SubscriptionsController,
} from "./http.controller";
import { MerchantController, PlansController, SplitsController } from "./extra.controller";
import { PaymentsService } from "./payments.service";
import { PrismaService } from "./prisma.service";
import { allowRequest } from "./rate-limit";

@Module({
  controllers: [HealthController, AuthController, SubscriptionsController, CreatorsController, PaymentsController, InternalController, PlansController, SplitsController, MerchantController],
  providers: [PrismaService, CurrentUser, PaymentsService, JobsService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply((request: Request, response: Response, next: NextFunction) => {
        const forwarded = request.headers["x-forwarded-for"];
        const key = request.ip || (Array.isArray(forwarded) ? forwarded[0] : forwarded) || "local";
        void allowRequest(String(key)).then((allowed) => {
          if (!allowed) {
            response.status(429).json({ message: "Too many requests" });
            return;
          }
          next();
        });
      })
      .forRoutes("*");
  }
}
