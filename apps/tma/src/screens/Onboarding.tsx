import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@telegram-apps/telegram-ui";
import { haptic } from "../telegram";
import { useAppStore } from "../store";

const ARTS = [
  <svg key="a" width="168" height="120" viewBox="0 0 168 120" fill="none">
    <rect x="18" y="22" width="132" height="78" rx="16" fill="var(--section)" />
    <rect x="32" y="40" width="70" height="10" rx="5" fill="var(--button)" />
    <rect x="32" y="58" width="104" height="8" rx="4" fill="var(--secondary)" />
    <rect x="32" y="74" width="84" height="8" rx="4" fill="var(--secondary)" />
  </svg>,
  <svg key="b" width="168" height="120" viewBox="0 0 168 120" fill="none">
    <circle cx="84" cy="60" r="36" fill="var(--section)" />
    <path d="M70 60h28M84 46v28" stroke="var(--button)" strokeWidth="6" strokeLinecap="round" />
  </svg>,
