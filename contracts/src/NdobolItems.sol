// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;
import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {INdobolItems} from "./interfaces/INdobolItems.sol";
/// @notice ERC-1155 interface skeleton; minting deliberately disabled in phase 1.
contract NdobolItems is ERC1155, Ownable, INdobolItems {
    constructor(address initialOwner) ERC1155("") Ownable(initialOwner) {}
    function mint(address, uint256, uint256, bytes calldata) external onlyOwner { revert PhaseOneStub(); }
}
