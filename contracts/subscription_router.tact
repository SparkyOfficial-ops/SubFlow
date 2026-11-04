import "@stdlib/deploy";

// Черновик мастер-контракта платформы. Не деплоить без тестов и аудита.
// Принимает оплату в TON, забирает комиссию и сразу отправляет остаток мерчанту.
// Для USDT ждёт transfer_notification от своего jetton-кошелька и делает два jetton-перевода.

message PayTon {
    merchant: Address;
    subscriptionId: Int as uint64;
    userId: Int as uint64;
}

message SetFee {
    feeBps: Int as uint16;
}

message SetJettonWallet {
    jettonWallet: Address;
    treasury: Address;
}

message(0x7362d09c) JettonTransferNotification {
    queryId: Int as uint64;
    amount: Int as coins;
    sender: Address;
    forwardPayload: Slice as remaining;
}

message(0x0f8a7ea5) JettonTransfer {
    queryId: Int as uint64;
