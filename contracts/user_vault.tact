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
