import { newChainNonce } from "@subflow/shared";
import { useTonConnectUI, useTonWallet } from "@tonconnect/ui-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { listSubscriptions, watchChainPayment } from "../api";
import { formatMoney } from "../money";
import { routerMessage } from "../router-pay";
import { useAppStore } from "../store";
import type { Subscription } from "../types";
import { haptic, runtime } from "../telegram";

export function PaySheet({ subscription, onClose }: { subscription: Subscription; onClose: () => void }) {
  const { t } = useTranslation();
  const wallet = useTonWallet();
  const [tonConnect] = useTonConnectUI();
  const renew = useAppStore((state) => state.renewLocal);
  const telegramId = useAppStore((state) => state.telegramId);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = import.meta.env.VITE_ROUTER_ADDRESS;

  const markLocal = () => {
    renew(subscription.id);
    void haptic("success");
    setMessage(t("pay.marked"));
  };

  const send = async (currency: "TON" | "USDT") => {
    if (!wallet) {
      setMessage(t("pay.connectFirst"));
      await tonConnect.openModal();
      return;
    }
    if (!router) {
      setMessage(t("pay.noRouter"));
      if (currency === "TON") markLocal();
      return;
    }
    if (!telegramId) {
      setMessage(t("pay.needSession"));
      return;
    }
    const chainNonce = subscription.chainNonce || newChainNonce();
    if (!subscription.chainNonce) useAppStore.getState().updateSubscription(subscription.id, { chainNonce });
    setBusy(true);
    try {
      const messageBody = await routerMessage({
        currency,
        amount: subscription.amount,
        merchant: wallet.account.address,
        chainNonce,
        telegramId,
        router,
        payer: wallet.account.address,
      });
      const result = await tonConnect.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [{ address: messageBody.to, amount: messageBody.amount, payload: messageBody.payload }],
      });
      const status = await watchChainPayment({ boc: result.boc, currency, chainNonce, kind: "subscription" });
      if (status === "confirmed") {
        const rows = await listSubscriptions();
        if (rows) useAppStore.setState({ subscriptions: rows });
        setMessage(t("pay.confirmed"));
        void haptic("success");
      } else if (status === "pending") {
        setMessage(t("pay.pending"));
      } else {
        setMessage(t("pay.rejected"));
        void haptic("error");
      }
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
        <p className="notice">{t("pay.ref", { id: subscription.chainNonce ?? subscription.id })}</p>
        {!runtime.inTelegram && <p className="notice">{t("profile.outside")}</p>}
        <div className="stack" style={{ marginTop: 12 }}>
          {subscription.currency === "TON" && (
            <button type="button" className="primary" disabled={busy} onClick={() => void send("TON")}>{t("pay.ton")}</button>
          )}
          {subscription.currency === "USDT" && (
            <button type="button" className="primary" disabled={busy} onClick={() => void send("USDT")}>{t("pay.usdt")}</button>
          )}
          <button type="button" className="ghost" onClick={markLocal}>{t("detail.renew")}</button>
          <button type="button" className="text-btn" onClick={onClose}>{t("subs.later")}</button>
        </div>
        {message && <p className="notice">{message}</p>}
      </div>
    </div>
  );
}
