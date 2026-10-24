// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @notice Operator-funded native MON rewards. Only server-attested, surviving rounds qualify.
/// @dev Separate domain from legacy score proofs. Never mints currency. No owner withdrawal.
contract RiverRewards is Ownable {
    struct RoundReward {
        bytes32 roundId;
        address player;
        bytes32 trackId;
        uint256 score;
        uint256 trash;
        uint256 weightGrams;
        uint256 rewardWei;
        uint256 nonce;
        uint256 deadline;
    }
    uint256 public constant WEI_PER_GRAM = 10_000_000_000;
    uint256 public constant MAX_WEIGHT_GRAMS = 1_000_000;
    bytes32 public constant TYPEHASH = keccak256(
        "RoundReward(bytes32 roundId,address player,bytes32 trackId,uint256 score,uint256 trash,uint256 weightGrams,uint256 rewardWei,uint256 nonce,uint256 deadline)"
    );
    bytes32 private constant DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    address public signer;
    bool public paused;
    mapping(bytes32 => mapping(address => bool)) public claimed;
    mapping(address => mapping(uint256 => bool)) public usedNonces;
    uint256 private entered;
    error InvalidReward();
    error InvalidSigner();
    error Expired();
    error AlreadyClaimed();
    error WrongPlayer();
    error InsufficientPool();
    error TransferFailed();
    error Paused();
    error Reentrant();
    event Funded(address indexed funder, uint256 amount);
    event RewardClaimed(
        bytes32 indexed roundId, address indexed player, uint256 weightGrams, uint256 amount, uint256 nonce
    );
    event SignerChanged(address indexed signer);
    event PauseChanged(bool paused);

    constructor(address initialOwner, address rewardSigner) Ownable(initialOwner) {
        if (rewardSigner == address(0)) revert InvalidSigner();
        signer = rewardSigner;
    }

    receive() external payable {
        emit Funded(msg.sender, msg.value);
    }

    function setSigner(address next) external onlyOwner {
        if (next == address(0)) revert InvalidSigner();
        signer = next;
        emit SignerChanged(next);
    }

    function setPaused(bool value) external onlyOwner {
        paused = value;
        emit PauseChanged(value);
    }

    function domainSeparator() public view returns (bytes32) {
        return keccak256(
            abi.encode(DOMAIN_TYPEHASH, keccak256("NdobolRiverRewards"), keccak256("1"), block.chainid, address(this))
        );
    }

    function digest(RoundReward calldata r) public view returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", domainSeparator(), keccak256(abi.encode(TYPEHASH, r))));
    }

    function claim(RoundReward calldata r, bytes calldata signature) external {
        if (entered != 0) revert Reentrant();
        if (paused) revert Paused();
        if (msg.sender != r.player) revert WrongPlayer();
        if (block.timestamp > r.deadline) revert Expired();
        if (
            r.roundId == bytes32(0) || r.trackId == bytes32(0) || r.weightGrams == 0 || r.weightGrams > MAX_WEIGHT_GRAMS
                || r.rewardWei != r.weightGrams * WEI_PER_GRAM || r.score != r.weightGrams || r.trash == 0
                || r.trash > r.weightGrams
        ) revert InvalidReward();
        if (claimed[r.roundId][r.player] || usedNonces[r.player][r.nonce]) revert AlreadyClaimed();
        if (ECDSA.recover(digest(r), signature) != signer) revert InvalidSigner();
        if (address(this).balance < r.rewardWei) revert InsufficientPool();
        entered = 1;
        claimed[r.roundId][r.player] = true;
        usedNonces[r.player][r.nonce] = true;
        (bool ok,) = payable(r.player).call{value: r.rewardWei}("");
        if (!ok) revert TransferFailed();
        entered = 0;
        emit RewardClaimed(r.roundId, r.player, r.weightGrams, r.rewardWei, r.nonce);
    }
}
