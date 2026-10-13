import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { verifyInitData } from "./telegram-auth";

function signedInitData(token: string, fields: Record<string, string>): string {
  const dataCheckString = Object.entries(fields)
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(token).digest();
  const hash = createHmac("sha256", secret).update(dataCheckString).digest("hex");
  const query = new URLSearchParams({ ...fields, hash });
  return query.toString();
}

test("accepts a fresh signed initData", () => {
  const token = "123456:TEST";
  const now = 1_700_000_000;
  const initData = signedInitData(token, {
    auth_date: String(now),
    user: JSON.stringify({ id: 42, first_name: "Анна", username: "anna", language_code: "ru" }),
  });
  const result = verifyInitData(initData, token, now);
  assert.equal(result?.user.id, 42);
  assert.equal(result?.user.first_name, "Анна");
  assert.equal(result?.user.language_code, "ru");
});

test("rejects a tampered name and an expired auth date", () => {
  const token = "123456:TEST";
  const now = 1_700_000_000;
  const initData = signedInitData(token, {
    auth_date: String(now - 10),
    user: JSON.stringify({ id: 7, first_name: "Mia" }),
  });
  const broken = initData.replace("Mia", "Max");
  assert.equal(verifyInitData(broken, token, now), null);
  assert.equal(verifyInitData(initData, token, now + 60 * 60 * 48), null);
});
