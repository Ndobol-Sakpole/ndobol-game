// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IRiverRegistry} from "./interfaces/IRiverRegistry.sol";
/// @notice No client-submitted score is accepted until authoritative validation exists.
contract RiverRegistry is Ownable, IRiverRegistry {
    constructor(address initialOwner) Ownable(initialOwner) {}
    function submitRound(RoundResult calldata, bytes calldata) external pure { revert PhaseOneStub(); }
    function isRecorded(bytes32) external pure returns (bool) { return false; }
}
