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

  useEffect(() => {
    setWallet(wallet?.account.address);
    if (!wallet) {
      setBalances({ loading: false });
      return;
    }
    let stop = false;
    setBalances({ loading: true });
    const address = wallet.account.address;
    const master = import.meta.env.VITE_USDT_MASTER || USDT_MASTER;
    void Promise.all([
      fetch(`https://tonapi.io/v2/accounts/${address}`).then((response) => response.json()),
      fetch(`https://tonapi.io/v2/accounts/${address}/jettons/${encodeURIComponent(master)}`).then(async (response) => (response.ok ? response.json() : null)),
    ]).then(([account, jetton]) => {
      if (stop) return;
      const ton = typeof account?.balance === "string" || typeof account?.balance === "number" ? fromNano(account.balance) : undefined;
      const raw = jetton?.balance;
      const usdt = raw != null ? (Number(raw) / 1_000_000).toFixed(2) : "0.00";
      setBalances({ ton: ton ? Number(ton).toFixed(2) : undefined, usdt, loading: false });
    }).catch(() => {
      if (!stop) setBalances({ loading: false });
