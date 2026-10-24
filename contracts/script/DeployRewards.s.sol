// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;
import {RiverRewards} from "../src/RiverRewards.sol";

interface RewardDeployVm {
    function envUint(string calldata) external returns (uint256);
    function envAddress(string calldata) external returns (address);
    function startBroadcast(uint256) external;
    function stopBroadcast() external;
}

/// @notice Explicit, separately invoked deployment. Does not fund the pool or enable API claims.
contract DeployRewards {
    RewardDeployVm constant vm = RewardDeployVm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function run() external returns (RiverRewards pool) {
        require(block.chainid == 10143 || block.chainid == 143, "wrong chain");
        address owner = vm.envAddress("CONTRACT_OWNER");
        address signer = vm.envAddress("REWARD_SIGNER_ADDRESS");
        vm.startBroadcast(vm.envUint("DEPLOYER_PRIVATE_KEY"));
        pool = new RiverRewards(owner, signer);
        vm.stopBroadcast();
    }
}
