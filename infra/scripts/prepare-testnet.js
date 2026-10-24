import { readFile, writeFile, chmod } from "node:fs/promises";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { isAddress, zeroAddress } from "viem";

/** Prepare a local testnet-only environment. Re-running never rotates existing keys. */
export async function prepareTestnet(file = ".env") {
  let source;
  try { source = await readFile(file, "utf8"); }
  catch (error) {
    if (error.code !== "ENOENT") throw error;
    source = await readFile(new URL("../../.env.example", import.meta.url), "utf8");
  }
  const env = parseEnv(source);
  if (env.SIGNING_CHAIN_ID && env.SIGNING_CHAIN_ID !== "10143") throw new Error("TESTNET_ONLY: SIGNING_CHAIN_ID must be 10143");
  if (env.REWARD_POOL_ADDRESS && (!env.DEPLOYER_PRIVATE_KEY || !env.SIGNER_PRIVATE_KEY)) {
    throw new Error("EXISTING_POOL: restore existing keys; do not generate replacements for a deployed pool");
  }
  const deployerKey = env.DEPLOYER_PRIVATE_KEY || generatePrivateKey();
  const signerKey = env.SIGNER_PRIVATE_KEY || generatePrivateKey();
  let deployer, signer;
  try { deployer = privateKeyToAccount(deployerKey); signer = privateKeyToAccount(signerKey); }
  catch { throw new Error("INVALID_LOCAL_PRIVATE_KEY: check the local .env without sharing its contents"); }
  const owner = env.CONTRACT_OWNER || deployer.address;
  if (!isAddress(owner) || owner.toLowerCase() === zeroAddress) throw new Error("INVALID_CONTRACT_OWNER");
  if (env.REWARD_SIGNER_ADDRESS && env.REWARD_SIGNER_ADDRESS.toLowerCase() !== signer.address.toLowerCase()) throw new Error("SIGNER_ADDRESS_MISMATCH");
  const updates = {
    DEPLOYER_PRIVATE_KEY: deployerKey, SIGNER_PRIVATE_KEY: signerKey,
    CONTRACT_OWNER: owner, REWARD_SIGNER_ADDRESS: signer.address, SIGNING_CHAIN_ID: "10143",
  };
  for (const [name, value] of Object.entries(updates)) {
    const line = new RegExp(`^${name}=.*$`, "gm");
    source = line.test(source) ? source.replace(line, () => `${name}=${value}`) : `${source}\n${name}=${value}\n`;
  }
  await writeFile(file, source, { mode: 0o600 });
  await chmod(file, 0o600);
  return { chainId: 10143, deployer: deployer.address, owner, signer: signer.address };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(await prepareTestnet(), null, 2));
    console.log("Keys saved in local .env only. Fund the deployer with test MON; never commit or share .env.");
  } catch (error) {
    console.error(error.message); process.exitCode = 1;
  }
}
