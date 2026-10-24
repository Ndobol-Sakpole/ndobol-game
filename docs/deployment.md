# Game deployment: Vercel + Render + Supabase

Approved topology: Vercel serves static native ES modules, Render runs **one** authoritative Node/WebSocket process, Supabase stores completed rounds and signed results. No additional npm dependencies. Local development stays SQLite. The separate promotional website is not part of this game deployment.

## 1. Supabase
Create/select a project, then run `data/supabase/001_game.sql` in its SQL editor. It creates private `ndobol_*` tables and the `ndobol_store` RPC. Keep the service-role key **only on Render**, never on Vercel or in browser files. Auth here is wallet challenge authentication in the API; no Supabase browser authentication is required.

## 2. Render
Import `render.yaml` as a Blueprint. Supply:

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (legacy service-role JWT).
- `ALLOWED_ORIGINS`: exact Vercel production origin, comma-separated if multiple. No wildcard or path. Add a preview deployment's exact origin only when needed.
- `SIGNER_PRIVATE_KEY`: dedicated server reward signer; this is **not** the pool's owner/deployer key.
- `REWARD_POOL_ADDRESS`: deployed pool contract, after step 4.

Default `REWARD_CLAIMS_ENABLED=false`. During initial API deployment, signing key/pool may remain blank. The executable checks Supabase connectivity/migration before listening. `/health` must be healthy. Render's `PORT` and `HOST=0.0.0.0` are supported. WSS uses the same public service origin/port, path `/rooms`. No Vercel function hosts sockets.

Blueprint uses the free plan as a test scaffold; idle spin-down/cold start and restart interrupt live rooms. For a continuously available playtest, select a suitable always-on plan yourself; this repository does not buy or upgrade a plan. Keep **one instance**: rooms and login tokens are in process memory. Restart/redeploy ends unfinished rounds; completed Supabase data remains. Horizontal scaling requires a separate room routing/state design.

## 3. Vercel
Set project root to this repository; `vercel.json` overrides the website build:

```
PUBLIC_API_ORIGIN=https://YOUR-API.onrender.com
```

`npm run build:game` copies only `apps/web` and `shared` into `dist/game`, replacing only that generated directory. It writes the public HTTPS API/WSS endpoints to `apps/web/runtime-config.js`. No bundling/transpilation. `/` redirects to `/apps/web/index.html` so relative native module/assets URLs work. Confirm `/shared/messages.js` and `/apps/web/vendor/three.module.min.js` load. **Do not configure server keys on Vercel.**

## 4. Monad Testnet pool
Chain ID **10143**, native **test MON**, RPC `https://testnet-rpc.monad.xyz`. Test MON has no monetary value. Get gas from the [official faucet](https://faucet.monad.xyz). Use separate deployer/owner and server-signer keys. Configure only in an ignored `.env` or your local secret manager:

```
DEPLOYER_PRIVATE_KEY= # local deployment only
CONTRACT_OWNER= # public owner address
REWARD_SIGNER_ADDRESS= # public address derived from SIGNER_PRIVATE_KEY
REWARD_POOL_ADDRESS= # fill after deployment
FUND_MON= # explicit amount of test MON to deposit
```

Compile first, then run these separately; **deploy/fund send transactions** only when explicitly invoked:

```sh
forge build --root contracts
node --env-file=.env infra/scripts/testnet-rewards.js deploy
# Put the printed contract address into REWARD_POOL_ADDRESS; choose FUND_MON.
node --env-file=.env infra/scripts/testnet-rewards.js fund
node --env-file=.env infra/scripts/testnet-rewards.js check
```

The script refuses a non-10143 RPC, verifies deployed runtime bytecode against the compiled artifact, owner, signer and fixed weight rate, waits for successful receipts, and reports pool balance. `check` is read-only. A nonzero pool balance is not a promise to cover all future rewards. Funding is a deposit; the current contract has **no owner withdrawal function**. Existing Foundry deploy/verify scripts remain available in `contracts/script/`.

Set the same `SIGNER_PRIVATE_KEY`, `REWARD_POOL_ADDRESS`, `SIGNING_CHAIN_ID=10143` on Render. Enable `REWARD_CLAIMS_ENABLED=true` only after checking the funded/unpaused pool. Login and claim are separate wallet requests. A completed, surviving server round with human-collected litter produces an EIP-712 proof. Claim calls the pool with zero transfer value; the player pays gas. UI says paid only after a matching `RewardClaimed` event in a successful receipt.

## Acceptance on the deployed services
1. Connect an EIP-1193 browser wallet, switch/add Monad Testnet, sign the origin-bound login challenge.
2. Create a room; a second wallet joins by code. Or ready/start alone with bots.
3. Hold Space/touch gas; release stops thrust. Collect with Q/E. Reconnect restores the same wallet/slot within 30 seconds.
4. Finish alive with human litter collected. Check DB persistence and proof; claim with the same wallet. Confirm the pool event and balance delta after gas. Repeat claim must revert.
5. Check per-track leaderboard and exact-origin CORS. Unknown origins and unsigned clients cannot enter rooms.

## Verification boundaries
No Vercel/Render/Supabase project or Monad contract is provisioned by build/test. Deployment and funding have not been performed in this revision. Injected browser wallets and Foundry tests are explicitly local test evidence, not public-chain receipts. The login implementation supports EOA/EIP-191 signatures; contract wallets (EIP-1271) and WalletConnect mobile pairing are not implemented. Open the mobile game inside an injected-wallet browser.

Sources: [Render WebSockets](https://render.com/docs/websocket), [Vercel project configuration](https://vercel.com/docs/project-configuration), [Supabase database functions](https://supabase.com/docs/guides/database/functions), [Supabase API key security](https://supabase.com/docs/guides/getting-started/api-keys), [Monad Testnet](https://docs.monad.xyz/developer-essentials/testnet).

Public repository CI activation: copy `infra/ci/github-actions.yml` to `.github/workflows/ci.yml` through GitHub with workflow permission. This release does not have active GitHub Actions.
