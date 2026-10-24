# Contract implementations
Skeleton contracts import public interfaces from `interfaces/`. Only ERC1155 standard and Ownable plumbing work; application mutations deliberately revert. No signature verification or economic rules have been enabled.

RiverRewards.sol: kontrak reward aktif secara kode, domain NdobolRiverRewards/1, struct RoundReward dengan weightGrams/rewardWei. Constructor(owner,signer); receive funding, claim, claimed, usedNonces, setSigner, setPaused, digest/domainSeparator. Tidak dideploy oleh tugas ini.
