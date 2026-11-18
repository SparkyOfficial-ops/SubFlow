import assert from "node:assert/strict";
import test from "node:test";
import { Address, Cell } from "@ton/core";
import { PAY_TON_OPCODE, decodePayTon, payTonPayload } from "../../packages/shared/src/chain";

test("frontend PayTon opcode is the router opcode", () => {
  const merchant = new Address(0, Buffer.alloc(32, 9)).toString();
  const cell = Cell.fromBase64(payTonPayload({ merchant, chainNonce: 1n, telegramId: 2n }));
  assert.equal(cell.beginParse().loadUint(32), PAY_TON_OPCODE);
  const decoded = decodePayTon(cell);
  assert.equal(decoded?.chainNonce, 1n);
  assert.equal(decoded?.telegramId, 2n);
});
