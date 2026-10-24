// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;
import {NdobolItems} from "../src/NdobolItems.sol";
import {RiverRegistry} from "../src/RiverRegistry.sol";
import {ImpactBadge} from "../src/ImpactBadge.sol";
import {IRiverRegistry} from "../src/interfaces/IRiverRegistry.sol";
interface Vm { function expectRevert(bytes4) external; function expectRevert(bytes calldata) external; function prank(address) external; }
contract PhaseOneTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    NdobolItems items;
    RiverRegistry registry;
    ImpactBadge badge;
    function setUp() public { items = new NdobolItems(address(this)); registry = new RiverRegistry(address(this)); badge = new ImpactBadge(address(this)); }
    function testERC1155InterfaceAndEmptyBalance() public view { require(items.supportsInterface(0xd9b67a26)); require(items.supportsInterface(0x01ffc9a7)); require(items.balanceOf(address(this),1) == 0); }
    function testOwnerAssignments() public view { require(items.owner() == address(this)); require(registry.owner() == address(this)); require(badge.owner() == address(this)); }
    function testMintDisabled() public { vm.expectRevert(bytes4(keccak256("PhaseOneStub()"))); items.mint(address(this),1,1,""); }
    function testUnprivilegedMintRejected() public { vm.prank(address(7)); (bool ok,) = address(items).call(abi.encodeCall(items.mint,(address(7),1,1,""))); require(!ok); }
    function testRegistryNeverAcceptsClientResult() public { IRiverRegistry.RoundResult memory result; result.roundId = bytes32(uint256(1)); vm.expectRevert(bytes4(keccak256("PhaseOneStub()"))); registry.submitRound(result,""); require(!registry.isRecorded(result.roundId)); }
    function testBadgeDisabled() public { vm.expectRevert(bytes4(keccak256("PhaseOneStub()"))); badge.award(address(this),1,bytes32(0)); require(!badge.hasBadge(address(this),1)); }
    function testZeroOwnerRejected() public { vm.expectRevert(abi.encodeWithSignature("OwnableInvalidOwner(address)",address(0))); new NdobolItems(address(0)); }
}
