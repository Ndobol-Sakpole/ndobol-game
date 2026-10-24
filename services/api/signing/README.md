# Signing
`createSigner(store,{privateKey,chainId,verifyingContract,now,config})` returns `enabled`, public `address`, async `sign({roundId,playerId},token)` and `get(roundId,token)`. Configuration defaults to server environment. `ApiError` carries HTTP status/code. No client scores are accepted. Authenticated persisted evidence, rate limit, physics validation, one-time signature and monotonic nonce are mandatory.

See `docs/signing.md` for the exact EIP-712 schema, disabled guest claims, duplicate recovery and Phase 3 compatibility work. Secrets never enter snapshots, logs, browser modules or SQL.

V5 options tambahan: rewardPool=REWARD_POOL_ADDRESS, claimsEnabled=REWARD_CLAIMS_ENABLED===true. rewardConfig memberi konfigurasi publik. New weighted RoundReward memakai kontrak RiverRewards; RoundResult lama tetap domain lama. Validasi pickup_json/grams/reward/rules; fatal→403 REWARD_FORFEITED, zero→422 NO_REWARD. get() memperbarui flag aktivasi saja, tidak isi signature.

## Current revision — 24 October 2026
Store calls and get are awaited. See data/supabase for transactional nonce/signature writes. Wallet ownership is required at room entry; EIP-712 proof format remains v5.

Setup behavior: a key may be prepared before deployment with claims disabled. Without a configured verifier, signing stays disabled and the API can still run. Claims explicitly enabled without a key/pool fail startup. Modern Supabase server keys use SUPABASE_SECRET_KEY; no browser key is used.

`sponsor.js:createSponsor(store,signer,options)` exposes enabled/address/claim(roundId,token). It saves signed transaction bytes and a daily fee reservation before broadcast, verifies receipts and resumes the same hash after restart. Testnet10143 only. See docs/sponsored-claims.md.
