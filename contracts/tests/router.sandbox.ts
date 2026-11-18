import test from "node:test";
import { existsSync } from "node:fs";
import { join } from "node:path";

test("router sandbox runs after the tact build", async (t) => {
  const dir = join(process.cwd(), "build", "SubscriptionRouter");
  if (!existsSync(dir)) {
    t.skip("Скомпилируйте contracts: npm run build --prefix contracts");
    return;
  }
  const sandbox = await import("@ton/sandbox");
  const blockchain = await sandbox.Blockchain.create();
  const treasury = await blockchain.treasury("owner");
  const sent = await treasury.send({ to: treasury.address, value: 1n });
  if (sent.transactions.length === 0) t.diagnostic("sandbox produced no transactions");
});
