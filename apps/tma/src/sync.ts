import type { Session } from "./api";
import { listPlans, listSplits, listSubscriptions, saveSubscription } from "./api";
import { useAppStore } from "./store";

export async function hydrateFromServer(session: Session): Promise<void> {
  const user = session.user;
  const plus = Boolean(user.plusUntil && new Date(user.plusUntil).getTime() > Date.now());
  const local = useAppStore.getState().subscriptions;
  let subscriptions = await listSubscriptions();
  if (subscriptions && subscriptions.length === 0 && local.length) {
    for (const item of local) await saveSubscription(item);
    subscriptions = await listSubscriptions();
  }
  const [plans, splits] = await Promise.all([listPlans(), listSplits()]);
  useAppStore.getState().applyServer({
    displayCurrency: user.displayCurrency || "USD",
    notifyDays: user.notifyDays?.length ? user.notifyDays : [7, 3, 1],
    plus,
    walletAddress: user.walletAddress ?? undefined,
    telegramId: user.telegramId,
    subscriptions: subscriptions ?? undefined,
    plans: plans ?? undefined,
    splits: splits ?? undefined,
  });
}
