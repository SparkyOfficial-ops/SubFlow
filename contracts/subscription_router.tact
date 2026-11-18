import "@stdlib/deploy";

// Черновик мастер-контракта платформы. Не деплоить без тестов и аудита.
// Принимает оплату в TON, забирает комиссию и сразу отправляет остаток мерчанту.
// Для USDT ждёт transfer_notification от своего jetton-кошелька и делает два jetton-перевода.

message(0xA1F0C701) PayTon {
    merchant: Address;
    subscriptionId: Int as uint64;
    userId: Int as uint64;
}

message(0xA1F0C702) MerchantPayout {
    subscriptionId: Int as uint64;
    userId: Int as uint64;
    payer: Address;
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
    amount: Int as coins;
    destination: Address;
    responseDestination: Address;
    customPayload: Cell?;
    forwardTonAmount: Int as coins;
    forwardPayload: Slice as remaining;
}

message PaymentAccepted {
    subscriptionId: Int as uint64;
    userId: Int as uint64;
    merchant: Address;
    amount: Int as coins;
    currency: Int as uint8;
}

contract SubscriptionRouter with Deployable {
    owner: Address;
    feeBps: Int as uint16;
    jettonWallet: Address?;
    treasury: Address;

    init(owner: Address) {
        self.owner = owner;
        self.feeBps = 150;
        self.jettonWallet = null;
        self.treasury = owner;
    }

    receive(msg: PayTon) {
        let incoming = context().value;
        require(incoming > ton("0.05"), "Payment is too small");
        let fee = (incoming * self.feeBps) / 10000;
        let gas = ton("0.02");
        require(incoming > fee + gas, "Cannot cover fee and gas");
        let payout = incoming - fee - gas;
        let payer = sender();
        send(SendParameters{
            to: msg.merchant,
            value: payout,
            mode: SendPayGasSeparately,
            bounce: true,
            body: MerchantPayout{
                subscriptionId: msg.subscriptionId,
                userId: msg.userId,
                payer: payer
            }.toCell()
        });
        if (fee > 0) {
            send(SendParameters{
                to: self.treasury,
                value: fee,
                mode: SendPayGasSeparately,
                bounce: false
            });
        }
        emit(PaymentAccepted{
            subscriptionId: msg.subscriptionId,
            userId: msg.userId,
            merchant: msg.merchant,
            amount: payout,
            currency: 0
        }.toCell());
    }

    receive(msg: JettonTransferNotification) {
        let wallet = self.jettonWallet;
        require(wallet != null, "Jetton wallet is not set");
        require(sender() == wallet!!, "Unexpected jetton wallet");
        let payload = msg.forwardPayload;
        require(payload.remainingBits() >= 32 + 64 + 64 + 267, "Missing payment payload");
        let prefix = payload.loadUint(32);
        require(prefix == 0, "Unexpected payload");
        // Дальше бэкенд читает комментарий. Сумма и адреса лежат явно, чтобы не зависеть от текста.
        let subscriptionId = payload.loadUint(64);
        let userId = payload.loadUint(64);
        let merchant = payload.loadAddress();
        let fee = (msg.amount * self.feeBps) / 10000;
        let payout = msg.amount - fee;
        require(payout > 0, "Nothing to forward");
        self.forwardJetton(merchant, payout);
        if (fee > 0) {
            self.forwardJetton(self.treasury, fee);
        }
        emit(PaymentAccepted{
            subscriptionId: subscriptionId,
            userId: userId,
            merchant: merchant,
            amount: payout,
            currency: 1
        }.toCell());
    }

    receive(msg: SetFee) {
        require(sender() == self.owner, "Only owner");
        require(msg.feeBps <= 250, "Fee is above 2.5%");
        self.feeBps = msg.feeBps;
    }

    receive(msg: SetJettonWallet) {
        require(sender() == self.owner, "Only owner");
        self.jettonWallet = msg.jettonWallet;
        self.treasury = msg.treasury;
    }

    bounced(src: bounced<MerchantPayout>) {
        // Отскочить может исходящая выплата мерчанту, а не входящий PayTon.
        // Возвращённые TON уходят плательщику, комиссия казначейства этим сообщением не двигается.
        let returned = context().value;
        if (returned > ton("0.02")) {
            send(SendParameters{
                to: src.payer,
                value: returned - ton("0.01"),
                mode: SendPayGasSeparately,
                bounce: false
            });
        }
    }

    fun forwardJetton(destination: Address, amount: Int) {
        let wallet = self.jettonWallet!!;
        send(SendParameters{
            to: wallet,
            value: ton("0.06"),
            mode: SendPayGasSeparately,
            bounce: true,
            body: JettonTransfer{
                queryId: 0,
                amount: amount,
                destination: destination,
                responseDestination: self.owner,
                customPayload: null,
                forwardTonAmount: 1,
                forwardPayload: emptySlice()
            }.toCell()
        });
    }

    get fun feeBps(): Int {
        return self.feeBps;
    }

    get fun owner(): Address {
        return self.owner;
    }
}
