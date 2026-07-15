import type { Category, MoneyCurrency, PaymentMethod, SubPeriod } from "@subflow/shared";

export interface Template {
  id: string;
  name: string;
  emoji: string;
  color: string;
  amount: number;
  currency: MoneyCurrency;
  period: SubPeriod;
  category: Category;
  method: PaymentMethod;
}

export const TEMPLATES: Template[] = [
  { id: "netflix", name: "Netflix", emoji: "N", color: "#E50914", amount: 15.49, currency: "USD", period: "month", category: "entertainment", method: "card" },
  { id: "spotify", name: "Spotify", emoji: "S", color: "#1DB954", amount: 11.99, currency: "USD", period: "month", category: "entertainment", method: "card" },
  { id: "youtube", name: "YouTube Premium", emoji: "Y", color: "#FF0033", amount: 13.99, currency: "USD", period: "month", category: "entertainment", method: "card" },
  { id: "chatgpt", name: "ChatGPT Plus", emoji: "G", color: "#10A37F", amount: 20, currency: "USD", period: "month", category: "work", method: "card" },
  { id: "claude", name: "Claude Pro", emoji: "C", color: "#D97757", amount: 20, currency: "USD", period: "month", category: "work", method: "card" },
  { id: "adobe", name: "Adobe CC", emoji: "A", color: "#FF0000", amount: 59.99, currency: "USD", period: "month", category: "work", method: "card" },
  { id: "icloud", name: "iCloud+", emoji: "i", color: "#3D8BFF", amount: 2.99, currency: "USD", period: "month", category: "other", method: "card" },
  { id: "tg", name: "Telegram Premium", emoji: "T", color: "#2AABEE", amount: 4.99, currency: "USD", period: "month", category: "telegram", method: "stars" },
  { id: "vpn", name: "VPN", emoji: "V", color: "#2BB5A0", amount: 8, currency: "USDT", period: "month", category: "vpn", method: "usdt" },
  { id: "notion", name: "Notion Plus", emoji: "N", color: "#111111", amount: 12, currency: "USD", period: "month", category: "work", method: "card" },
  { id: "tondns", name: "TON DNS", emoji: ".t", color: "#0098EA", amount: 1, currency: "TON", period: "year", category: "telegram", method: "ton" },
  { id: "google", name: "Google One", emoji: "G", color: "#4285F4", amount: 1.99, currency: "USD", period: "month", category: "other", method: "card" },
];

export const CATEGORY_COLOR: Record<Category, string> = {
  entertainment: "#E85D75",
  work: "#7C6AF7",
  vpn: "#2BB5A0",
  telegram: "#2AABEE",
  other: "#8E8E93",
};
