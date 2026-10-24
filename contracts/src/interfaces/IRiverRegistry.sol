// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;
interface IRiverRegistry {
    error PhaseOneStub();
    struct RoundResult { bytes32 roundId; address player; bytes32 trackId; uint256 score; uint256 trashCount; uint256 durationMs; uint256 nonce; uint256 deadline; }
    event RoundRecorded(bytes32 indexed roundId, address indexed player, uint256 score, uint256 trashCount);
    function submitRound(RoundResult calldata result, bytes calldata signature) external;
    function isRecorded(bytes32 roundId) external view returns (bool);
}
