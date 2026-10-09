import { createHmac, timingSafeEqual } from "node:crypto";

export interface TelegramWebUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface VerifiedInitData {
  user: TelegramWebUser;
  authDate: number;
  startParam?: string;
}

/**
 * Проверка подписи Telegram initData: HMAC-SHA256.
 * Ключ — HMAC("WebAppData", bot token). В строку входят все поля, кроме hash.
