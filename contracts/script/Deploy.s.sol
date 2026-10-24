// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;
import {NdobolItems} from "../src/NdobolItems.sol";
import {RiverRegistry} from "../src/RiverRegistry.sol";
import {ImpactBadge} from "../src/ImpactBadge.sol";
interface DeployVm { function envUint(string calldata) external returns (uint256); function envAddress(string calldata) external returns (address); function startBroadcast(uint256) external; function stopBroadcast() external; }
contract Deploy {
    DeployVm constant vm = DeployVm(address(uint160(uint256(keccak256("hevm cheat code")))));
    function run() external returns (NdobolItems items, RiverRegistry registry, ImpactBadge badge) {
        uint256 key = vm.envUint("DEPLOYER_PRIVATE_KEY"); address owner = vm.envAddress("CONTRACT_OWNER");
        require(owner != address(0), "owner required"); require(block.chainid == 10143 || block.chainid == 143, "wrong chain");
        vm.startBroadcast(key);
        items = new NdobolItems(owner); registry = new RiverRegistry(owner); badge = new ImpactBadge(owner);
        vm.stopBroadcast();
    }
}
