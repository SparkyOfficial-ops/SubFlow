import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { loadEnv } from "./env";

async function bootstrap() {
  loadEnv();
  const app = await NestFactory.create(AppModule);
  const configured = (process.env.CORS_ORIGIN || process.env.WEBAPP_URL || "http://localhost:5173")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const origin = [...new Set([...configured, "http://localhost:5173", "http://127.0.0.1:5173"])];
  app.enableCors({ origin });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
