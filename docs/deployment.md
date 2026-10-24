# Game deployment: Vercel + Render + Supabase

Approved topology: Vercel serves static native ES modules, Render runs **one** authoritative Node/WebSocket process, Supabase stores completed rounds and signed results. No additional npm dependencies. Local development stays SQLite. The separate promotional website is not part of this game deployment.

## 1. Supabase
Create/select a project, then run `data/supabase/001_game.sql` in its SQL editor. It creates private `ndobol_*` tables and the `ndobol_store` RPC. Keep the service-role key **only on Render**, never on Vercel or in browser files. Auth here is wallet challenge authentication in the API; no Supabase browser authentication is required.

## 2. Render
Import `render.yaml` as a Blueprint, or update an existing manual Web Service (no new service needed):

- Root directory: repository root; branch `main`.
- Build: `npm ci --omit=dev --ignore-scripts && npm run build:api`.
- Start: `npm run start:api`; health check: `/health`.
- Environment: `NODE_VERSION=24`, `NODE_ENV=production`, `HOST=0.0.0.0`, `DATA_BACKEND=supabase`, `TRUST_PROXY=true`, `SIGNING_CHAIN_ID=10143`.
- The project API origin is `https://ndobol-game.onrender.com`. Forks use their own service.

Supply:

- `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (`sb_secret_…`; legacy `SUPABASE_SERVICE_ROLE_KEY` remains supported).
- `ALLOWED_ORIGINS`: exact Vercel production origin, comma-separated if multiple. No wildcard or path. Add a preview deployment's exact origin only when needed.
- `SIGNER_PRIVATE_KEY`: dedicated server reward signer; this is **not** the pool's owner/deployer key.
- `REWARD_POOL_ADDRESS`: deployed pool contract, after step 4.

Default `REWARD_CLAIMS_ENABLED=false`. During initial API deployment, keep claims disabled and the pool blank. A prepared signer key without a verifier leaves signing disabled while games remain available. Enabling claims without a key and pool is rejected. The executable checks Supabase connectivity/migration before listening. `/health` must be healthy. Render's `PORT` and `HOST=0.0.0.0` are supported. WSS uses the same public service origin/port, path `/rooms`. No Vercel function hosts sockets.

Blueprint uses the free plan as a test scaffold; idle spin-down/cold start and restart interrupt live rooms. For a continuously available playtest, select a suitable always-on plan yourself; this repository does not buy or upgrade a plan. Keep **one instance**: rooms and login tokens are in process memory. Restart/redeploy ends unfinished rounds; completed Supabase data remains. Horizontal scaling requires a separate room routing/state design.

## 3. Vercel
Set project root to this repository, preset Other, Node 24.x. `vercel.json` runs `npm run build:vercel`. Configure this public variable for Production and Preview:

```
PUBLIC_API_ORIGIN=https://ndobol-game.onrender.com
```

The Vercel build defaults to this supplied project endpoint when the variable is absent. Independent installations **must override it with their own API origin**. Plain `npm run build:game` still requires an explicit origin; invalid HTTP/authenticated/path-bearing origins fail validation. After the web deploy is Ready, copy its HTTPS origin into Render's `ALLOWED_ORIGINS`, save/redeploy Render, and reload the browser. Do not put the Render URL or `/apps/web/index.html` into `ALLOWED_ORIGINS`.

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

## Build failure fix — 24 October 2026

`Set PUBLIC_API_ORIGIN` came from the frontend packager running on Render and from missing frontend configuration on Vercel. `infra/build-target.js` now selects API when `RENDER=true`, Vercel packaging when `VERCEL=1`, or explicit `api`/`vercel` targets. API builds import-check runtime dependencies without opening ports/databases or accessing credentials. `npm start` also runs only the API on Render; local `npm run dev` continues to start both services and read local `.env`. The API binds `0.0.0.0` by default on Render and uses its assigned `PORT`.

`package.json` bounds Node to `>=24.5.0 <25`; `.node-version` and the Blueprint select series 24. An existing Render `NODE_VERSION` environment override takes precedence, so change it to `24` if needed. No dependencies or public gameplay/protocol interfaces changed.

Use **Deploy latest commit** on Render and a new deployment from `main` on Vercel. Rebuilding the old `4724efc` source still has the old failure. Successful packaging does not prove Supabase configuration or on-chain claims are active; verify `/health`, wallet login, a room, and a real claim receipt separately.

References: [Render Node selection](https://render.com/docs/node-version), [Render automatic RENDER variable](https://render.com/docs/environment-variables), [Vercel build configuration](https://vercel.com/docs/project-configuration/vercel-json).


Supabase key update: use `SUPABASE_SECRET_KEY=sb_secret_…` on Render and the local .env. The existing `SUPABASE_SERVICE_ROLE_KEY` name is still accepted for legacy installs. New keys are opaque, so the adapter sends them as apikey without a JWT Authorization header. Public `NEXT_PUBLIC_SUPABASE_*` snippets are not consumed by this native frontend. [Supabase API key documentation](https://supabase.com/docs/guides/getting-started/api-keys). Setup walkthrough: [quickstart-rewards.md](quickstart-rewards.md).

Startup compatibility: preparing SIGNER_PRIVATE_KEY before a verifier exists no longer stops the API when claims are disabled; the public signing/enabled flags remain false. Setting REWARD_CLAIMS_ENABLED=true without a signer and pool fails startup. Message and contract interfaces are unchanged.
