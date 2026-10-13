import { createHmac, timingSafeEqual } from "node:crypto";

interface TokenPayload {
  sub: string;
  tid: string;
  exp: number;
}

function secret(): string {
