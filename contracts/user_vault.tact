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
