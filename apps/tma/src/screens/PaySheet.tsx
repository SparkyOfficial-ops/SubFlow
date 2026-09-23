import { Address, beginCell, toNano } from "@ton/core";
import { useTonConnectUI, useTonWallet } from "@tonconnect/ui-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { USDT_MASTER } from "@subflow/shared";
import { submitChainPayment } from "../api";
import { formatMoney } from "../money";
import { useAppStore } from "../store";
import type { Subscription } from "../types";
import { haptic, runtime } from "../telegram";

export function PaySheet({ subscription, onClose }: { subscription: Subscription; onClose: () => void }) {
  const { t } = useTranslation();
  const wallet = useTonWallet();
  const [tonConnect] = useTonConnectUI();
  const renew = useAppStore((state) => state.renewLocal);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = import.meta.env.VITE_ROUTER_ADDRESS;
  const comment = `sf:${subscription.id}`;

  const markLocal = () => {
    renew(subscription.id);
    void haptic("success");
    setMessage(t("pay.marked"));
  };

  const payTon = async () => {
    if (!wallet) {
      setMessage(t("pay.connectFirst"));
      await tonConnect.openModal();
      return;
    }
    if (!router) {
      setMessage(t("pay.noRouter"));
      markLocal();
      return;
    }
    setBusy(true);
    try {
      const payload = beginCell().storeUint(0, 32).storeStringTail(comment).endCell().toBoc().toString("base64");
      const result = await tonConnect.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [{ address: router, amount: toNano(subscription.amount).toString(), payload }],
      });
      await submitChainPayment({ txHash: result.boc, comment, currency: "TON" });
      setMessage(t("pay.sent"));
      void haptic("success");
    } catch {
      setMessage(t("pay.failed"));
      void haptic("error");
    } finally {
      setBusy(false);
    }
  };

  const payUsdt = async () => {
    if (!wallet) {
      setMessage(t("pay.connectFirst"));
      await tonConnect.openModal();
      return;
    }
    if (!router) {
      setMessage(t("pay.noRouter"));
      return;
    }
    setBusy(true);
    try {
      const master = import.meta.env.VITE_USDT_MASTER || USDT_MASTER;
      const info = await fetch(`https://tonapi.io/v2/accounts/${wallet.account.address}/jettons/${encodeURIComponent(master)}`);
      if (!info.ok) throw new Error("jetton");
      const body = (await info.json()) as { wallet_address?: { address?: string } };
      const jettonWallet = body.wallet_address?.address;
      if (!jettonWallet) throw new Error("wallet");
      const transfer = beginCell()
        .storeUint(0x0f8a7ea5, 32)
        .storeUint(0, 64)
        .storeCoins(BigInt(Math.round(subscription.amount * 1_000_000)))
        .storeAddress(Address.parse(router))
        .storeAddress(Address.parse(wallet.account.address))
        .storeBit(0)
        .storeCoins(toNano("0.05"))
        .storeBit(1)
        .storeRef(beginCell().storeUint(0, 32).storeStringTail(comment).endCell())
        .endCell()
        .toBoc()
        .toString("base64");
      const result = await tonConnect.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [{ address: jettonWallet, amount: toNano("0.08").toString(), payload: transfer }],
      });
      await submitChainPayment({ txHash: result.boc, comment, currency: "USDT" });
      setMessage(t("pay.sent"));
      void haptic("success");
    } catch {
      setMessage(t("pay.failed"));
      void haptic("error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sheet" onClick={onClose}>
      <div className="sheet-card" onClick={(event) => event.stopPropagation()}>
        <h3>{t("pay.title")}</h3>
        <p className="hero-sum" style={{ fontSize: 28 }}>{formatMoney(subscription.amount, subscription.currency)}</p>
        <p className="muted">{subscription.name}</p>
        <p className="notice">{t("pay.comment", { comment })}</p>
