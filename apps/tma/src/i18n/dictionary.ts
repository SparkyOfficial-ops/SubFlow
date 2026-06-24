import {
  type Category,
  type DisplayCurrency,
  type MoneyCurrency,
  type PaymentMethod,
  type PlanPeriod,
  type SubPeriod,
} from "@subflow/shared";

export const ru = {
  appName: "SubFlow",
  tabs: {
    home: "Обзор",
    subs: "Подписки",
    calendar: "Календарь",
    creator: "Авторам",
    profile: "Профиль",
  },
  onboarding: {
    skip: "Пропустить",
    next: "Дальше",
    start: "Открыть SubFlow",
    slides: [
      {
        title: "Все списания на одном экране",
        text: "iCloud, ChatGPT, VPN, TON DNS и закрытые каналы. Календарь платежей и сумма в USD, EUR, UAH или TON.",
      },
      {
        title: "Продление в одно движение",
        text: "За день до конца бот присылает готовый чек. Вы подтверждаете его в кошельке. Карту на десятках сервисов светить не нужно.",
      },
      {
        title: "Канал, который сам пускает оплативших",
        text: "Тариф в TON, USDT или Stars. После оплаты — одноразовая ссылка, через сутки после окончания — выход из чата.",
      },
    ],
  },
  dash: {
    hello: "Привет{{name}}",
    month: "В этом месяце",
    year: "Прогноз на год",
    upcoming: "Ближайшие списания",
    categories: "Категории",
    trials: "Заканчивается пробный период",
    emptyTitle: "Пока ни одной подписки",
    emptyText: "Добавьте сервис вручную или из шаблонов — покажем, куда уходят деньги.",
    add: "Добавить подписку",
    demo: "Показать пример",
