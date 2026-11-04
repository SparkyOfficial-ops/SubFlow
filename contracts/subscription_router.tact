import "@stdlib/deploy";

// Черновик мастер-контракта платформы. Не деплоить без тестов и аудита.
// Принимает оплату в TON, забирает комиссию и сразу отправляет остаток мерчанту.
// Для USDT ждёт transfer_notification от своего jetton-кошелька и делает два jetton-перевода.

message PayTon {
    merchant: Address;
