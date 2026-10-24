// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;
interface IImpactBadge {
    error PhaseOneStub();
    function award(address player, uint256 badgeId, bytes32 roundId) external;
    function hasBadge(address player, uint256 badgeId) external view returns (bool);
}
