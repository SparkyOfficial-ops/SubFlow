import { DISPLAY_CURRENCIES, USDT_MASTER } from "@subflow/shared";
import { useTonConnectUI, useTonWallet } from "@tonconnect/ui-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fromNano } from "@ton/core";
import { useAppStore } from "../store";
import { haptic, runtime } from "../telegram";

export function Profile() {
  const { t } = useTranslation();
  const currency = useAppStore((state) => state.displayCurrency);
  const setCurrency = useAppStore((state) => state.setCurrency);
  const notifyDays = useAppStore((state) => state.notifyDays);
  const toggleNotify = useAppStore((state) => state.toggleNotify);
  const setWallet = useAppStore((state) => state.setWallet);
  const plus = useAppStore((state) => state.plus);
  const wallet = useTonWallet();
  const [tonConnect] = useTonConnectUI();
  const [balances, setBalances] = useState<{ ton?: string; usdt?: string; loading: boolean }>({ loading: false });
