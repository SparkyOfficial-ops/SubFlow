import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Bot, InlineKeyboard } from "grammy";

function loadEnv(): void {
  for (const file of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")]) {
    if (!existsSync(file)) continue;
