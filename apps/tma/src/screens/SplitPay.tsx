import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTonConnectUI, useTonWallet } from "@tonconnect/ui-react";
import { beginCell, toNano } from "@ton/core";
import type { MoneyCurrency } from "@subflow/shared";
import { getSplit } from "../api";
import { Mark } from "../components/ui";
import { formatMoney } from "../money";
import { useAppStore } from "../store";
import { haptic } from "../telegram";

export function SplitPay({ subscriptionId, poolId }: { subscriptionId?: string; poolId?: string }) {
  const { t } = useTranslation();
  const all = useAppStore((state) => state.subscriptions);
  const subs = all.filter((item) => item.status !== "cancelled");
  const splits = useAppStore((state) => state.splits);
  const saveSplit = useAppStore((state) => state.saveSplit);
  const rememberSplit = useAppStore((state) => state.rememberSplit);
  const markShare = useAppStore((state) => state.markShare);
  const wallet = useAppStore((state) => state.walletAddress);
  const setRoute = useAppStore((state) => state.setRoute);
  const [picked, setPicked] = useState(subscriptionId ?? subs[0]?.id ?? "");
  const [friend, setFriend] = useState("");
  const [note, setNote] = useState("");
  const connected = useTonWallet();
  const [tonConnect] = useTonConnectUI();
  const sub = subs.find((item) => item.id === picked);
  const invited = poolId ? splits.find((item) => item.id === poolId) : undefined;
  const pool = invited ?? splits.find((item) => item.subscriptionId === picked);
  const bot = import.meta.env.VITE_BOT_USERNAME || "SubFlowBot";
  const link = pool ? `https://t.me/${bot}/app?startapp=split_${pool.id}` : "";
  const view = sub
    ? { color: sub.color, currency: sub.currency }
    : pool
      ? { color: pool.color ?? "#5b6b7c", currency: (pool.currency ?? "TON") as MoneyCurrency }
      : null;

  useEffect(() => {
    if (!poolId) return;
    const found = useAppStore.getState().splits.find((item) => item.id === poolId);
    if (found) {
      setPicked(found.subscriptionId);
      return;
    }
    void getSplit(poolId).then((remote) => {
      if (!remote) return;
      rememberSplit(remote);
      setPicked(remote.subscriptionId);
    });
  }, [poolId, rememberSplit]);

  const create = () => {
    if (!sub) return;
    const selfShare = Number((sub.amount / 2).toFixed(2));
    saveSplit({
      id: crypto.randomUUID(),
      subscriptionId: sub.id,
      organizerAddress: connected?.account.address ?? wallet,
      title: sub.name,
      amount: sub.amount,
      currency: sub.currency,
      color: sub.color,
      members: [
        { id: crypto.randomUUID(), name: t("split.you"), share: selfShare, status: "paid", isSelf: true },
        { id: crypto.randomUUID(), name: friend.trim() || "2", share: Number((sub.amount - selfShare).toFixed(2)), status: "pending" },
      ],
    });
    setFriend("");
    void haptic("success");
  };

  const addFriend = () => {
    if (!pool || !friend.trim() || !sub) return;
    const count = pool.members.length + 1;
    const share = Number((sub.amount / count).toFixed(2));
    saveSplit({
      ...pool,
      members: [
        ...pool.members.map((member) => ({ ...member, share, status: member.isSelf ? "paid" as const : member.status })),
        { id: crypto.randomUUID(), name: friend.trim(), share, status: "pending" },
      ],
    });
    setFriend("");
  };

  const payShare = async (memberId: string, share: number) => {
    if (!pool || !view) return;
    if (view.currency !== "TON") {
      markShare(pool.id, memberId);
      void haptic("success");
      return;
    }
    if (!pool.organizerAddress) {
      setNote(t("split.noWallet"));
      if (!connected) await tonConnect.openModal();
      return;
    }
    if (!connected) {
      await tonConnect.openModal();
      return;
    }
    if (connected.account.address === pool.organizerAddress) {
      markShare(pool.id, memberId);
      void haptic("success");
      return;
    }
    try {
      const payload = beginCell().storeUint(0, 32).storeStringTail(`split_${pool.id}`).endCell().toBoc().toString("base64");
      await tonConnect.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [{ address: pool.organizerAddress, amount: toNano(share).toString(), payload }],
      });
      markShare(pool.id, memberId);
      void haptic("success");
    } catch {
      void haptic("error");
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setNote(t("split.copied"));
    void haptic("tap");
  };

  return (
    <div>
      <div className="topbar">
        <button type="button" className="icon-btn" onClick={() => setRoute({ name: "home" })}>←</button>
        <h1>{t("split.title")}</h1>
      </div>
      <p className="muted">{t("split.lead")}</p>
      <label className="field">
        {t("subs.title")}
        <select value={picked} onChange={(event) => setPicked(event.target.value)}>
          {subs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      {!sub && !pool && <p className="notice">{t("split.empty")}</p>}
      {sub && !pool && (
        <div className="stack" style={{ marginTop: 12 }}>
          <button type="button" className="primary" onClick={create}>{t("split.create")}</button>
        </div>
      )}
      {pool && view && (
        <>
          <section className="section">
            <h2>{t("split.members")}</h2>
            <div className="rail">
              {pool.members.map((member) => (
                <div className="row" key={member.id}>
                  <Mark color={view?.color ?? "#5b6b7c"} label={member.name} />
                  <span>
                    <span className="row-title">{member.name}</span>
                    <span className="row-meta">{member.status === "paid" ? t("split.paid") : t("split.pending")}</span>
                  </span>
                  <span className="amount">{formatMoney(member.share, view?.currency ?? "TON")}</span>
                </div>
              ))}
            </div>
          </section>
          <label className="field">
            {t("split.addFriend")}
            <input value={friend} onChange={(event) => setFriend(event.target.value)} />
          </label>
          <div className="stack" style={{ marginTop: 12 }}>
            <button type="button" className="ghost" onClick={addFriend}>{t("split.add")}</button>
            <button type="button" className="ghost" onClick={() => void copy()}>{t("split.copy")}</button>
            {pool.members.filter((member) => !member.isSelf && member.status === "pending").map((member) => (
              <button type="button" className="primary" key={member.id} onClick={() => void payShare(member.id, member.share)}>
                {t("split.pay")} · {member.name}
              </button>
            ))}
          </div>
          <p className="notice">{link}</p>
        </>
      )}
      {note && <p className="notice">{note}</p>}
      <p className="notice">{t("split.stage")}</p>
    </div>
  );
}
