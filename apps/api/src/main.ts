import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { loadEnv } from "./env";

async function bootstrap() {
  loadEnv();
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true });
