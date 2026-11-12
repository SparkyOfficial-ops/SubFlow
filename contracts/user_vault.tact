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
