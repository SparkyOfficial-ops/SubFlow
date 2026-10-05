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
    });
    return () => {
      stop = true;
    };
  }, [wallet, setWallet]);

  return (
    <div>
      <h1 className="screen-title">{t("profile.title")}</h1>
      {!runtime.inTelegram && <p className="notice">{t("profile.outside")}</p>}
      <section className="section">
        <h2>{t("profile.wallet")}</h2>
        <div className="hero">
          <p className="row-title">{wallet ? `${wallet.account.address.slice(0, 6)}…${wallet.account.address.slice(-4)}` : t("profile.guest")}</p>
          {balances.loading ? (
            <div className="stack" style={{ marginTop: 12 }}>
              <div className="skel" />
              <div className="skel" style={{ width: "60%" }} />
              <p className="row-meta">{t("profile.loading")}</p>
            </div>
          ) : wallet ? (
            <p className="hero-sub">{balances.ton ?? "—"} TON · {balances.usdt ?? "—"} USDT</p>
          ) : null}
          <div className="stack" style={{ marginTop: 12 }}>
            {wallet ? (
              <button type="button" className="ghost" onClick={() => { void tonConnect.disconnect(); void haptic("tap"); }}>{t("profile.disconnect")}</button>
            ) : (
              <button type="button" className="primary" onClick={() => { void tonConnect.openModal(); void haptic("tap"); }}>{t("profile.connect")}</button>
            )}
          </div>
        </div>
      </section>
      <section className="section">
        <h2>{t("profile.currency")}</h2>
        <div className="chips">
          {DISPLAY_CURRENCIES.map((item) => (
            <button type="button" key={item} className={item === currency ? "chip on" : "chip"} onClick={() => setCurrency(item)}>
              {t(`display.${item}`)}
            </button>
          ))}
        </div>
      </section>
      <section className="section">
        <h2>{t("profile.notify")}</h2>
        <div className="chips">
          {[7, 3, 1].map((day) => (
            <button type="button" key={day} className={notifyDays.includes(day) ? "chip on" : "chip"} onClick={() => toggleNotify(day)}>
              {t("profile.days", { count: day })}
            </button>
          ))}
        </div>
      </section>
      <section className="section">
        <h2>{t("profile.vaultTitle")}</h2>
        <p className="muted">{t("profile.vaultText")}</p>
      </section>
      {plus && <p className="notice">{t("profile.plusOn")}</p>}
    </div>
  );
}
