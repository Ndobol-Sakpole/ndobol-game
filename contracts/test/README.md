# Contract tests
`forge test` memakai cheatcode interface minimal tanpa forge-std dependency. Setiap test mendapat instance baru. Tidak menghubungi RPC atau melakukan transaksi jaringan.

Rewards.t.sol: native payout tepat, replay, penerima, domain/chain/contract, expired, empty/refill, rejecting receiver, reentrancy, owner/pause/rotation, 256 fuzz masses serta digest fixture viem. Key12345 hanya fixture tes tanpa dana publik.
