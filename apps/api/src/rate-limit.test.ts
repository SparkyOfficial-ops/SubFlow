import assert from "node:assert/strict";
import test from "node:test";
import { allowRequest, bucketHas } from "./rate-limit";

test("memory limiter forgets buckets after the window", async () => {
  const previous = process.env.REDIS_URL;
  delete process.env.REDIS_URL;
  const key = `expired-${Date.now()}`;
  await allowRequest(key, 5, 1);
  await new Promise((resolve) => setTimeout(resolve, 15));
  await allowRequest(`fresh-${Date.now()}`, 5, 60_000);
  assert.equal(bucketHas(key), false);
  if (previous) process.env.REDIS_URL = previous;
});
