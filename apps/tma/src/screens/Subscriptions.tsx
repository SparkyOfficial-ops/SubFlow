import { useState } from "react";
import { useTranslation } from "react-i18next";
import { formatMoney, inDisplay } from "../money";
import { Mark } from "../components/ui";
import { useAppStore } from "../store";
import { haptic } from "../telegram";

export function Subscriptions() {
  const { t } = useTranslation();
  const [archive, setArchive] = useState(false);
  const [limit, setLimit] = useState(false);
  const subs = useAppStore((state) => state.subscriptions);
  const currency = useAppStore((state) => state.displayCurrency);
  const setRoute = useAppStore((state) => state.setRoute);
  const canAdd = useAppStore((state) => state.canAdd);
  const visible = subs.filter((item) => (archive ? item.status === "cancelled" : item.status !== "cancelled"));

  const add = () => {
    void haptic("tap");
    if (!canAdd()) {
      setLimit(true);
      return;
    }
