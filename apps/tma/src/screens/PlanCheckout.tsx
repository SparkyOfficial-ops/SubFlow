import { useTonConnectUI, useTonWallet } from "@tonconnect/ui-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { newChainNonce, type PlanPeriod } from "@subflow/shared";
import { createStarsInvoice, publicPlan, watchChainPayment } from "../api";
import { formatMoney } from "../money";
import { routerMessage } from "../router-pay";
import { useAppStore } from "../store";
import type { CreatorPlan } from "../types";
import { haptic, runtime } from "../telegram";

export function PlanCheckout({ planId }: { planId: string }) {
  const { t } = useTranslation();
  const setRoute = useAppStore((state) => state.setRoute);
  const local = useAppStore((state) => state.plans.find((item) => item.id === planId));
  const telegramId = useAppStore((state) => state.telegramId);
  const wallet = useTonWallet();
  const [tonConnect] = useTonConnectUI();
  const [plan, setPlan] = useState<(CreatorPlan & { ownerWallet?: string | null }) | null>(local ?? null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const router = import.meta.env.VITE_ROUTER_ADDRESS;

  useEffect(() => {
    void publicPlan(planId).then((remote) => {
      if (remote) setPlan(remote);
    });
  }, [planId]);

  const stars = async () => {
    if (!plan || plan.currency !== "STARS") return;
    if (!runtime.inTelegram || !window.Telegram?.WebApp?.openInvoice) {
      setNote(t("pay.starsNeedTg"));
      return;
    }
    const url = await createStarsInvoice({ id: plan.id, title: plan.title, amount: Math.round(plan.amount) });
    if (!url) {
      setNote(t("creator.saveFailed"));
      return;
    }
    window.Telegram.WebApp.openInvoice(url, (status) => setNote(status === "paid" ? t("pay.confirmed") : t("pay.failed")));
  };

  const chain = async () => {
    if (!plan || (plan.currency !== "TON" && plan.currency !== "USDT")) return;
    const merchant = plan.ownerWallet || local?.ownerWallet;
    if (!merchant) {
      setNote(t("checkout.noWallet"));
      return;
    }
    if (!wallet) {
      setNote(t("pay.connectFirst"));
      await tonConnect.openModal();
      return;
    }
    const chainNonce = plan.chainNonce || newChainNonce();
    if (!plan.chainNonce) useAppStore.getState().savePlan({ ...plan, chainNonce, ownerWallet: merchant });
    if (!router || !telegramId) {
      setNote(t("pay.needSession"));
      return;
    }
    setBusy(true);
    try {
      const message = await routerMessage({
        currency: plan.currency,
        amount: plan.amount,
        merchant,
        chainNonce,
        telegramId,
        router,
        payer: wallet.account.address,
      });
      const result = await tonConnect.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [{ address: message.to, amount: message.amount, payload: message.payload }],
      });
      const status = await watchChainPayment({ boc: result.boc, currency: plan.currency, chainNonce, kind: "plan" });
      setNote(status === "confirmed" ? t("pay.confirmed") : status === "pending" ? t("pay.pending") : t("pay.rejected"));
      void haptic(status === "confirmed" ? "success" : "error");
    } catch {
      setNote(t("pay.failed"));
      void haptic("error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="topbar">
        <button type="button" className="icon-btn" onClick={() => setRoute({ name: "home" })}>←</button>
        <h1>{t("checkout.title")}</h1>
      </div>
      {!plan && <p className="notice">{t("checkout.missing")}</p>}
      {plan && (
        <div className="hero" style={{ marginTop: 14 }}>
          <b>{plan.title}</b>
          <p className="hero-sum" style={{ fontSize: 32 }}>{formatMoney(plan.amount, plan.currency)}</p>
          <p className="muted">{t(`periods.${plan.period as PlanPeriod}`)}</p>
          <div className="stack" style={{ marginTop: 12 }}>
            {plan.currency === "STARS" && <button type="button" className="primary" onClick={() => void stars()}>{t("creator.stars")}</button>}
            {(plan.currency === "TON" || plan.currency === "USDT") && (
              <button type="button" className="primary" disabled={busy} onClick={() => void chain()}>{t("creator.crypto")}</button>
            )}
          </div>
          {note && <p className="notice">{note}</p>}
        </div>
      )}
    </div>
  );
}
