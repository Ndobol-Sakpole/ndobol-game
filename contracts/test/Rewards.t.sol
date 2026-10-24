// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;
import {RiverRewards} from "../src/RiverRewards.sol";

interface RewardVm {
    function addr(uint256) external returns (address);
    function sign(uint256, bytes32) external returns (uint8, bytes32, bytes32);
    function deal(address, uint256) external;
    function prank(address) external;
    function expectRevert(bytes4) external;
    function expectRevert() external;
    function warp(uint256) external;
    function chainId(uint256) external;
    function etch(address, bytes calldata) external;
}

contract RejectReward {
    receive() external payable {
        revert();
    }
}

contract ReentrantReward {
    RiverRewards pool;
    RiverRewards.RoundReward result;
    bytes signature;
    bool public blocked;

    constructor(RiverRewards p) {
        pool = p;
    }

    function run(RiverRewards.RoundReward calldata r, bytes calldata s) external {
        result = r;
        signature = s;
        pool.claim(r, s);
    }

    receive() external payable {
        try pool.claim(result, signature) {
            blocked = false;
        }
            catch {
            blocked = true;
        }
    }
}

contract RewardsTest {
    RewardVm constant vm = RewardVm(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 constant KEY = 12345; // Test-only key; never used on a public chain.
    RiverRewards pool;
    address player;

    function setUp() public {
        vm.chainId(10143);
        player = address(0xBEEF);
        pool = new RiverRewards(address(this), vm.addr(KEY));
        vm.deal(address(pool), 1 ether);
    }

    function result() internal view returns (RiverRewards.RoundReward memory) {
        return RiverRewards.RoundReward(
            bytes32(uint256(1)),
            player,
            keccak256("bengawan"),
            15000,
            100,
            15000,
            0.00015 ether,
            0,
            block.timestamp + 100
        );
    }

    function sign(RiverRewards.RoundReward memory r) internal returns (bytes memory) {
        (uint8 v, bytes32 a, bytes32 b) = vm.sign(KEY, pool.digest(r));
        return abi.encodePacked(a, b, v);
    }

    function testPaysExactNativeMONAndBlocksRoundAndNonceReplay() public {
        RiverRewards.RoundReward memory r = result();
        bytes memory sig = sign(r);
        vm.prank(player);
        pool.claim(r, sig);
        require(player.balance == 0.00015 ether && pool.claimed(r.roundId, player));
        vm.expectRevert(RiverRewards.AlreadyClaimed.selector);
        vm.prank(player);
        pool.claim(r, sig);
        r.nonce = 1;
        sig = sign(r);
        vm.expectRevert(RiverRewards.AlreadyClaimed.selector);
        vm.prank(player);
        pool.claim(r, sig);
        r.roundId = bytes32(uint256(2));
        r.nonce = 0;
        sig = sign(r);
        vm.expectRevert(RiverRewards.AlreadyClaimed.selector);
        vm.prank(player);
        pool.claim(r, sig);
    }

    function testOutOfOrderNoncesAreIndependent() public {
        RiverRewards.RoundReward memory r = result();
        r.nonce = 9;
        bytes memory sig = sign(r);
        vm.prank(player);
        pool.claim(r, sig);
        r.roundId = bytes32(uint256(2));
        r.nonce = 3;
        sig = sign(r);
        vm.prank(player);
        pool.claim(r, sig);
        require(player.balance == 0.0003 ether);
    }

    function testCannotStealAnotherPlayersProof() public {
        RiverRewards.RoundReward memory r = result();
        bytes memory sig = sign(r);
        vm.expectRevert(RiverRewards.WrongPlayer.selector);
        pool.claim(r, sig);
        r.player = address(this);
        vm.expectRevert(RiverRewards.InvalidSigner.selector);
        pool.claim(r, sig);
    }

    function testRejectsInflatedRewardZeroMassAndUnsignedWeight() public {
        RiverRewards.RoundReward memory r = result();
        bytes memory sig = sign(r);
        r.rewardWei += 1;
        vm.expectRevert(RiverRewards.InvalidReward.selector);
        vm.prank(player);
        pool.claim(r, sig);
        r = result();
        r.weightGrams = 0;
        vm.expectRevert(RiverRewards.InvalidReward.selector);
        vm.prank(player);
        pool.claim(r, sig);
        r = result();
        r.weightGrams = 16000;
        r.score = 16000;
        r.rewardWei = 16000 * pool.WEI_PER_GRAM();
        vm.expectRevert(RiverRewards.InvalidSigner.selector);
        vm.prank(player);
        pool.claim(r, sig);
    }

    function testDeadlineDomainChainAndContractAreBound() public {
        RiverRewards.RoundReward memory r = result();
        bytes memory sig = sign(r);
        vm.chainId(143);
        vm.expectRevert(RiverRewards.InvalidSigner.selector);
        vm.prank(player);
        pool.claim(r, sig);
        vm.chainId(10143);
        RiverRewards other = new RiverRewards(address(this), vm.addr(KEY));
        vm.deal(address(other), 1 ether);
        vm.expectRevert(RiverRewards.InvalidSigner.selector);
        vm.prank(player);
        other.claim(r, sig);
        vm.warp(r.deadline + 1);
        vm.expectRevert(RiverRewards.Expired.selector);
        vm.prank(player);
        pool.claim(r, sig);
    }

    function testEmptyPoolDoesNotConsumeProofAndCanBeFunded() public {
        RiverRewards.RoundReward memory r = result();
        bytes memory sig = sign(r);
        vm.deal(address(pool), 0);
        vm.expectRevert(RiverRewards.InsufficientPool.selector);
        vm.prank(player);
        pool.claim(r, sig);
        require(!pool.claimed(r.roundId, player) && !pool.usedNonces(player, 0));
        vm.deal(address(this), 1 ether);
        (bool ok,) = address(pool).call{value: 0.00015 ether}("");
        require(ok);
        vm.prank(player);
        pool.claim(r, sig);
        require(player.balance == 0.00015 ether);
    }

    function testRejectedPaymentRollsBackClaim() public {
        RiverRewards.RoundReward memory r = result();
        r.player = address(new RejectReward());
        bytes memory sig = sign(r);
        vm.expectRevert(RiverRewards.TransferFailed.selector);
        vm.prank(r.player);
        pool.claim(r, sig);
        require(!pool.claimed(r.roundId, r.player));
    }

    function testReentrancyCannotDoublePay() public {
        ReentrantReward attacker = new ReentrantReward(pool);
        RiverRewards.RoundReward memory r = result();
        r.player = address(attacker);
        bytes memory sig = sign(r);
        attacker.run(r, sig);
        require(attacker.blocked() && address(attacker).balance == 0.00015 ether);
    }

    function testSignerRotationPauseAndOwnerControl() public {
        RiverRewards.RoundReward memory r = result();
        bytes memory sig = sign(r);
        vm.expectRevert();
        vm.prank(player);
        pool.setSigner(player);
        vm.expectRevert(RiverRewards.InvalidSigner.selector);
        pool.setSigner(address(0));
        pool.setPaused(true);
        vm.expectRevert(RiverRewards.Paused.selector);
        vm.prank(player);
        pool.claim(r, sig);
        pool.setPaused(false);
        pool.setSigner(player);
        vm.expectRevert(RiverRewards.InvalidSigner.selector);
        vm.prank(player);
        pool.claim(r, sig);
    }

    function testFuzzExactRate(uint32 mass) public {
        uint256 grams = uint256(mass) % 1_000_000 + 1;
        RiverRewards.RoundReward memory r = result();
        r.weightGrams = grams;
        r.score = grams;
        r.trash = 1;
        r.rewardWei = grams * pool.WEI_PER_GRAM();
        bytes memory sig = sign(r);
        vm.prank(player);
        pool.claim(r, sig);
        require(player.balance == grams * 10_000_000_000);
    }

    function testViemTypedDataDigestMatchesSolidity() public {
        address verifier = 0x2222222222222222222222222222222222222222;
        vm.etch(verifier, address(pool).code);
        RiverRewards.RoundReward memory r = result();
        r.deadline = 1000;
        // Fixture generated with viem 2.57.10 + shared/reward-signing.js, not vm.sign.
        require(
            RiverRewards(payable(verifier)).digest(r)
                == 0x5121d8baf2a73170871a48e07732f67bea11dccdf743c6a14dbebd04ca281983
        );
    }
}
