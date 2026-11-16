import "@stdlib/deploy";

// Этап v2. Личный некастодиальный сейф.
// Владелец пополняет контракт и задаёт лимит: адрес сервиса, максимум и интервал.
// Релеер может вызвать charge только внутри этого лимита. Вывод остатка доступен владельцу всегда.

struct Allowance {
    maxAmount: Int as uint64;
    intervalSec: Int as uint32;
    lastChargeTs: Int as uint32;
}

message SetAllowance {
    merchant: Address;
    maxAmount: Int as uint64;
    intervalSec: Int as uint32;
}

message RemoveAllowance {
    merchant: Address;
}

message Charge {
    merchant: Address;
    amount: Int as uint64;
}

message WithdrawAll {}

contract UserVault with Deployable {
    owner: Address;
    relayer: Address;
    allowances: map<Address, Allowance>;

    init(owner: Address, relayer: Address) {
        self.owner = owner;
        self.relayer = relayer;
    }

    receive() {
        // Пополнение нативным TON без тела сообщения.
    }

    receive(msg: SetAllowance) {
        require(sender() == self.owner, "Only owner");
        require(msg.maxAmount > 0, "Empty limit");
        require(msg.intervalSec >= 3600, "Interval is too short");
        self.allowances.set(msg.merchant, Allowance{
            maxAmount: msg.maxAmount,
            intervalSec: msg.intervalSec,
            lastChargeTs: 0
        });
    }

    receive(msg: RemoveAllowance) {
        require(sender() == self.owner, "Only owner");
        self.allowances.del(msg.merchant);
    }

    receive(msg: Charge) {
        require(sender() == self.relayer, "Only relayer");
        let current = self.allowances.get(msg.merchant);
        require(current != null, "Merchant is not allowed");
        let allowance = current!!;
        require(msg.amount > 0 && msg.amount <= allowance.maxAmount, "Above the limit");
        require(now() >= allowance.lastChargeTs + allowance.intervalSec, "Too early");
        let reserve = ton("0.05");
        require(myBalance() > msg.amount + reserve, "Vault balance is too low");
        self.allowances.set(msg.merchant, Allowance{
            maxAmount: allowance.maxAmount,
            intervalSec: allowance.intervalSec,
            lastChargeTs: now()
        });
        send(SendParameters{
            to: msg.merchant,
            value: msg.amount,
            mode: SendPayGasSeparately,
            bounce: true,
            body: "subflow-vault".asComment()
        });
    }

    receive(_: WithdrawAll) {
        require(sender() == self.owner, "Only owner");
        send(SendParameters{
            to: self.owner,
            value: 0,
            mode: SendRemainingBalance,
            bounce: false
        });
    }

    bounced(src: bounced<Charge>) {
        // Если мерчант отклонил перевод, лимит уже сдвинут. Владелец может перезаписать allowance.
        // Событие остаётся в трассировке сообщения, а TON возвращается на баланс сейфа.
        require(src.amount >= 0, "Unexpected bounce");
    }

    get fun owner(): Address {
        return self.owner;
    }
}
