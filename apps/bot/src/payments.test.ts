import assert from "node:assert/strict";
import test from "node:test";
import { preCheckoutDecision } from "./payments";

test("accepts Plus and a plan invoice", () => {
  assert.equal(preCheckoutDecision("XTR", "plus").ok, true);
  assert.equal(preCheckoutDecision("XTR", "plan:abc:10001").ok, true);
});

test("rejects a foreign currency and a malformed payload", () => {
  assert.equal(preCheckoutDecision("TON", "plus").ok, false);
  assert.equal(preCheckoutDecision("XTR", "plan:abc").ok, false);
});
