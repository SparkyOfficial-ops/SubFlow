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

