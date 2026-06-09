# SubFlow

Центр подписок внутри Telegram: личный трекер списаний и приём оплаты за закрытый канал в TON, USDT и Stars.

## Что уже собрано

- **Mini App** (`apps/tma`) — онбординг, дашборд, трекер с шаблонами, календарь, Split Pay, кабинет автора, профиль с TON Connect. Интерфейс на русском и английском, цвета берутся из темы Telegram.
- **API** (`apps/api`) — проверка `initData` (HMAC-SHA256), подписки, тарифы автора, счёт Stars, подтверждение перевода только по данным TonAPI, вебхуки мерчанта, напоминания и исключение из чата после 24 часов.
- **Бот** (`apps/bot`) — `/start` с кнопкой Mini App и приём `successful_payment`.
- **Контракты** (`contracts`) — черновики `SubscriptionRouter` и `UserVault` на Tact. Это код для тестов, не аудированная версия для основной сети.

Оплата устроена как в ТЗ: пользователь сам подтверждает перевод. Контракт платформы не хранит чужие деньги, а сразу отправляет мерчанту сумму за вычетом комиссии. Полный автоплатёж через сейф — этап v2, в профиле он только описан.

## Запуск Mini App

```bash
npm install
npm run dev:tma
```

Откроется `http://localhost:5173`. Вне Telegram приложение работает как трекер: данные лежат в браузере. Кошелёк и Stars подключаются уже из бота.

Чтобы открыть его внутри Telegram, поднимите HTTPS-туннель на порт 5173 и укажите адрес в BotFather (`/newapp` или меню бота).

## API и бот

```bash
docker compose up -d
copy .env.example .env
```

В `.env` заполните `BOT_TOKEN`, `JWT_SECRET`, `INTERNAL_SECRET`. Затем:

```bash
npm run db:migrate
npm run dev:api
npm run dev:bot
```

`WEBAPP_URL` — публичный адрес Mini App. `ROUTER_ADDRESS` — адрес мастер-контракта после деплоя. Пока адреса нет, личный трекер просто сдвигает дату списания, а сетевой перевод не считается оплаченным.

Полезные маршруты:

- `POST /auth/telegram` — обмен проверенного `initData` на сессию
- `GET/POST /subscriptions`
- `POST /creators/plans`, `GET /creators/analytics`, `POST /creators/keys`, `POST /creators/invoices`
- `POST /payments/chain` — ищет финализированную транзакцию на адрес роутера
- `POST /internal/stars` — вызывает бот после оплаты Stars

Напоминания и кик неплательщиков крутятся очередью BullMQ, если поднят Redis. Без Redis API оставляет обычный минутный таймер.

## Проверки

```bash
npm test
npm run build -w @subflow/tma
```

Курс USD/EUR/UAH/TON на дашборде ориентировочный: он нужен для сводки, а не для проведения платежа.
