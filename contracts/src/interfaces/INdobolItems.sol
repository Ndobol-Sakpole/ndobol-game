// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;
interface INdobolItems {
    error PhaseOneStub();
    function mint(address to, uint256 id, uint256 amount, bytes calldata data) external;
}
