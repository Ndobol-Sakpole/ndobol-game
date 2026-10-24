import { readFile } from "node:fs/promises";
import { createPublicClient, createWalletClient, http, parseEther, formatEther, isAddress, zeroAddress, keccak256 } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet } from "viem/chains";
import { fileURLToPath } from "node:url";
/** Explicit CLI only. No deployment or payment is performed by dev/build/CI. */
export async function testnetRewards(action = "check") {
  if (!["check", "deploy", "fund", "fund-relayer"].includes(action)) throw new Error("Usage: testnet-rewards.js check|deploy|fund|fund-relayer");
  const rpc = process.env.MONAD_TESTNET_RPC || "https://testnet-rpc.monad.xyz";
  const chain = monadTestnet, transport = http(rpc, { timeout: 15000 });
  const publicClient = createPublicClient({ chain, transport });
  if (await publicClient.getChainId() !== 10143) throw new Error("TESTNET_ONLY");
  const abi = JSON.parse(await readFile(new URL("../../shared/abi/RiverRewards.json", import.meta.url), "utf8"));
  const key = process.env.DEPLOYER_PRIVATE_KEY;
  const owner = process.env.CONTRACT_OWNER, signer = process.env.REWARD_SIGNER_ADDRESS;
  let pool = process.env.REWARD_POOL_ADDRESS;
  const address = value => isAddress(value || "") && value.toLowerCase() !== zeroAddress;
  if (!address(owner) || !address(signer)) throw new Error("Set CONTRACT_OWNER and REWARD_SIGNER_ADDRESS (public addresses)");
  if (action === "deploy") {
    if (!key) throw new Error("Set DEPLOYER_PRIVATE_KEY locally; never put it in Vercel or the repository");
    const artifact = JSON.parse(await readFile(new URL("../../contracts/out/RiverRewards.sol/RiverRewards.json", import.meta.url), "utf8"));
    const account = privateKeyToAccount(key), wallet = createWalletClient({ account, chain, transport });
    const hash = await wallet.deployContract({ abi, bytecode: artifact.bytecode.object, args: [owner, signer] });
    console.log(`Deployment sent: ${hash}`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success" || !receipt.contractAddress) throw new Error("DEPLOY_FAILED");
    pool = receipt.contractAddress;
    console.log(`REWARD_POOL_ADDRESS=${pool}`);
  }
  if (!address(pool)) throw new Error("Set REWARD_POOL_ADDRESS after deployment");
  const compiled = JSON.parse(await readFile(new URL("../../contracts/out/RiverRewards.sol/RiverRewards.json", import.meta.url), "utf8"));
  const code = await publicClient.getBytecode({ address: pool });
  if (!code || keccak256(code) !== keccak256(compiled.deployedBytecode.object)) throw new Error("POOL_BYTECODE_MISMATCH: rebuild with the same compiler/settings used for deployment");
  const read = functionName => publicClient.readContract({ address: pool, abi, functionName });
  const [deployedOwner, deployedSigner, rate, paused] = await Promise.all([read("owner"), read("signer"), read("WEI_PER_GRAM"), read("paused")]);
  if (deployedOwner.toLowerCase() !== owner.toLowerCase() || deployedSigner.toLowerCase() !== signer.toLowerCase() || rate !== 10000000000n) throw new Error("POOL_CONFIGURATION_MISMATCH");
  if (action === "fund") {
    if (!key) throw new Error("DEPLOYER_PRIVATE_KEY required for explicit funding");
    if (!/^\d+(\.\d{1,18})?$/.test(process.env.FUND_MON || "")) throw new Error("Set explicit FUND_MON amount of test MON");
    const value = parseEther(process.env.FUND_MON);
    if (value <= 0n) throw new Error("FUND_MON must be positive");
    const account = privateKeyToAccount(key), wallet = createWalletClient({ account, chain, transport });
    const hash = await wallet.sendTransaction({ to: pool, value });
    console.log(`Funding sent: ${hash}`);
    if ((await publicClient.waitForTransactionReceipt({ hash })).status !== "success") throw new Error("FUND_FAILED");
  }
  if (action === "fund-relayer") {
    if (!key || !process.env.RELAYER_PRIVATE_KEY) throw new Error("Prepare separate local deployer and relayer keys with testnet:prepare");
    if (!/^\d+(\.\d{1,18})?$/.test(process.env.FUND_GAS_MON || "")) throw new Error("Set explicit FUND_GAS_MON for the gas wallet");
    const value = parseEther(process.env.FUND_GAS_MON), relayer = privateKeyToAccount(process.env.RELAYER_PRIVATE_KEY);
    const account = privateKeyToAccount(key);
    if (value <= 0n || relayer.address === account.address || relayer.address.toLowerCase() === signer.toLowerCase()) throw new Error("Use a separate relayer and positive FUND_GAS_MON");
    const wallet = createWalletClient({ account, chain, transport });
    const hash = await wallet.sendTransaction({ to: relayer.address, value });
    console.log(`Gas funding sent: ${hash}`);
    if ((await publicClient.waitForTransactionReceipt({ hash })).status !== "success") throw new Error("GAS_FUND_FAILED");
  }
  const balance = await publicClient.getBalance({ address: pool });
  console.log(JSON.stringify({ chainId: 10143, pool, owner: deployedOwner, signer: deployedSigner, paused, poolMON: formatEther(balance), funded: balance > 0n, explorer: `https://testnet.monadscan.com/address/${pool}` }, null, 2));
  if (paused || balance === 0n) console.log("Claims are not ready. Fund/unpause the pool before enabling REWARD_CLAIMS_ENABLED on Render.");
  if (process.env.RELAYER_PRIVATE_KEY) {
    const relayer = privateKeyToAccount(process.env.RELAYER_PRIVATE_KEY);
    console.log(JSON.stringify({ relayer: relayer.address, gasMON: formatEther(await publicClient.getBalance({ address: relayer.address })) }));
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await testnetRewards(process.argv[2]);
