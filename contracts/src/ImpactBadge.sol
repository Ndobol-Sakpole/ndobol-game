// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IImpactBadge} from "./interfaces/IImpactBadge.sol";
/// @notice Badge interface only; token standard and transfer policy deferred.
contract ImpactBadge is Ownable, IImpactBadge {
    constructor(address initialOwner) Ownable(initialOwner) {}
    function award(address, uint256, bytes32) external onlyOwner { revert PhaseOneStub(); }
    function hasBadge(address, uint256) external pure returns (bool) { return false; }
}
