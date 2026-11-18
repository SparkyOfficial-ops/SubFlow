import assert from "node:assert/strict";
import test from "node:test";
import { Address, Cell } from "@ton/core";
import { decodeJettonTransfer, decodePayTon, jettonTransferPayload, payTonPayload } from "@subflow/shared";
import { graceDeadline, starsTarget } from "./rules";
import { paymentMatches } from "./ton";

const router = new Address(0, Buffer.alloc(32, 1)).toString();
const merchant = new Address(0, Buffer.alloc(32, 2)).toString();
const payer = new Address(0, Buffer.alloc(32, 3)).toString();
const realJetton = new Address(0, Buffer.alloc(32, 4)).toString();
const fakeJetton = new Address(0, Buffer.alloc(32, 5)).toString();

test("PayTon payload round-trips the contract fields", () => {
  const boc = payTonPayload({ merchant, chainNonce: 42n, telegramId: 10001n });
  const decoded = decodePayTon(Cell.fromBase64(boc));
  assert.ok(decoded);
  assert.equal(decoded.chainNonce, 42n);
  assert.equal(decoded.telegramId, 10001n);
  assert.equal(Address.parse(decoded.merchant).equals(Address.parse(merchant)), true);
});

test("USDT forward payload round-trips and a fake jetton wallet does not match", () => {
  const boc = jettonTransferPayload({
    amount: 2_000_000n,
    router,
    responseAddress: payer,
    chainNonce: 7n,
    telegramId: 10001n,
    merchant,
  });
  const decoded = decodeJettonTransfer(Cell.fromBase64(boc));
  assert.equal(decoded?.chainNonce, 7n);
  assert.equal(decoded?.telegramId, 10001n);
  const expected = {
    currency: "USDT" as const,
    router,
    chainNonce: 7n,
    telegramId: 10001n,
    minUnits: 1_000_000n,
    merchant,
    usdtWallet: realJetton,
  };
  assert.equal(paymentMatches({ success: true, out_msgs: [{ destination: fakeJetton, raw_body: boc }] }, expected), false);
  assert.equal(paymentMatches({ success: true, out_msgs: [{ destination: realJetton, raw_body: boc }] }, expected), true);
});

test("TON payment must land on the router with the same nonce", () => {
  const boc = payTonPayload({ merchant, chainNonce: 9n, telegramId: 10001n });
  const expected = { currency: "TON" as const, router, chainNonce: 9n, telegramId: 10001n, minUnits: 500_000_000n, merchant };
  assert.equal(paymentMatches({ success: true, out_msgs: [{ destination: router, value: "1000000000", raw_body: boc }] }, expected), true);
  assert.equal(paymentMatches({ success: true, out_msgs: [{ destination: merchant, value: "1000000000", raw_body: boc }] }, expected), false);
  assert.equal(paymentMatches({ success: false, out_msgs: [{ destination: router, value: "1000000000", raw_body: boc }] }, expected), false);
});

test("stars payload must name the same payer", () => {
  assert.deepEqual(starsTarget("plus", "1"), { kind: "plus" });
  assert.deepEqual(starsTarget("plan:abc:55", "55"), { kind: "plan", planId: "abc" });
  assert.equal(starsTarget("plan:abc:55", "56"), null);
});

test("grace window is measured from expiry", () => {
  const expiry = new Date("2026-01-01T00:00:00Z");
  const deadline = graceDeadline(new Date("2026-01-02T00:00:00Z"), 24);
  assert.equal(deadline.getTime(), expiry.getTime());
});
