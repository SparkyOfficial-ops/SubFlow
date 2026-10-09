import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export function loadEnv(): void {
  for (const file of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")]) {
