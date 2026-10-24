import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseEnv } from "node:util";
import { prepareTestnet } from "../infra/scripts/prepare-testnet.js";

test("testnet setup stores separate keys privately, preserves custom owner, and never rotates on retry", async t => {
  const directory = await mkdtemp(path.join(tmpdir(), "ndobol-env-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, ".env");
  const owner = "0x" + "ab".repeat(20);
  await writeFile(file, `# keep this comment\nCONTRACT_OWNER=${owner}\nSUPABASE_URL=https://db.example.test\n`);
  const first = await prepareTestnet(file), contents = await readFile(file, "utf8"), env = parseEnv(contents);
  assert.equal(first.owner, owner);
  assert.notEqual(first.deployer, first.signer);
  assert.equal(new Set([first.deployer,first.signer,first.relayer]).size,3);
  assert.equal(first.chainId, 10143);
  assert.equal(env.SUPABASE_URL, "https://db.example.test");
  assert.match(contents, /# keep this comment/);
  assert.equal(JSON.stringify(first).includes(env.DEPLOYER_PRIVATE_KEY), false);
  assert.equal(JSON.stringify(first).includes(env.SIGNER_PRIVATE_KEY), false);
  assert.equal(JSON.stringify(first).includes(env.RELAYER_PRIVATE_KEY), false);
  assert.deepEqual(await prepareTestnet(file), first);
  assert.equal(await readFile(file, "utf8"), contents);
  if (process.platform !== "win32") assert.equal((await stat(file)).mode & 0o777, 0o600);
});

test("setup refuses key replacement for an existing pool and refuses mainnet without changing the file", async t => {
  const directory = await mkdtemp(path.join(tmpdir(), "ndobol-env-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, ".env");
  for (const [source, message] of [[`REWARD_POOL_ADDRESS=0x${"12".repeat(20)}\n`, /EXISTING_POOL/], ["SIGNING_CHAIN_ID=143\n", /TESTNET_ONLY/]]) {
    await writeFile(file, source);
    await assert.rejects(prepareTestnet(file), message);
    assert.equal(await readFile(file, "utf8"), source);
  }
});
