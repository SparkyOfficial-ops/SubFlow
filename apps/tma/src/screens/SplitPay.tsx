import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTonConnectUI, useTonWallet } from "@tonconnect/ui-react";
import { beginCell, toNano } from "@ton/core";
import { Mark } from "../components/ui";
import { formatMoney } from "../money";
import { useAppStore } from "../store";
import { haptic } from "../telegram";

export function SplitPay({ subscriptionId }: { subscriptionId?: string }) {
  const { t } = useTranslation();
  const all = useAppStore((state) => state.subscriptions);
  const subs = all.filter((item) => item.status !== "cancelled");
  const splits = useAppStore((state) => state.splits);
  const saveSplit = useAppStore((state) => state.saveSplit);
  const markShare = useAppStore((state) => state.markShare);
  const wallet = useAppStore((state) => state.walletAddress);
  const setRoute = useAppStore((state) => state.setRoute);
  const [picked, setPicked] = useState(subscriptionId ?? subs[0]?.id ?? "");
  const [friend, setFriend] = useState("");
  const [note, setNote] = useState("");
  const connected = useTonWallet();
  const [tonConnect] = useTonConnectUI();
  const sub = subs.find((item) => item.id === picked);
  const pool = splits.find((item) => item.subscriptionId === picked);
  const bot = import.meta.env.VITE_BOT_USERNAME || "SubFlowBot";
  const link = pool ? `https://t.me/${bot}/app?startapp=split_${pool.id}` : "";

  const create = () => {
    if (!sub) return;
    const selfShare = Number((sub.amount / 2).toFixed(2));
      saveSplit({
        id: crypto.randomUUID(),
        subscriptionId: sub.id,
        organizerAddress: connected?.account.address ?? wallet,
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
