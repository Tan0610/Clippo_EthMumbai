// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ClippoEscrow} from "../src/ClippoEscrow.sol";

/// Signs the World ID attestations the backend would sign.
abstract contract HumanHelper is Test {
    uint256 internal constant ATTESTOR_KEY = 0xA77E57;
    address internal attestor = vm.addr(ATTESTOR_KEY);
    uint64 private _salt;

    function _digest(ClippoEscrow e, bytes32 structHash) internal view returns (bytes32) {
        bytes32 domain = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("ClippoEscrow"),
                keccak256("1"),
                block.chainid,
                address(e)
            )
        );
        return keccak256(abi.encodePacked("\x19\x01", domain, structHash));
    }

    function _sign(uint256 key, bytes32 digest) internal pure returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, digest);
        return abi.encodePacked(r, s, v);
    }

    function _regProof(ClippoEscrow e, address wallet, bytes32 human, uint256 key)
        internal
        view
        returns (ClippoEscrow.HumanProof memory p)
    {
        p.human = human;
        p.expiresAt = uint64(block.timestamp + 1 hours);
        bytes32 h = keccak256(
            abi.encode(keccak256("HumanRegistration(address wallet,bytes32 human,uint64 expiresAt)"), wallet, human, p.expiresAt)
        );
        p.signature = _sign(key, _digest(e, h));
    }

    function _register(ClippoEscrow e, address wallet) internal {
        e.registerHuman(wallet, _regProof(e, wallet, keccak256(abi.encode("human", wallet)), ATTESTOR_KEY));
    }

    function _approval(ClippoEscrow e, uint256 id, uint8 kind, bytes32 subject, address approver, bytes32 human, uint64 expiresAt, uint256 key)
        internal
        view
        returns (ClippoEscrow.HumanProof memory p)
    {
        p.human = human;
        p.expiresAt = expiresAt;
        bytes32 h = keccak256(
            abi.encode(
                keccak256(
                    "HumanApproval(uint256 campaignId,uint8 kind,bytes32 subject,address approver,bytes32 human,uint64 expiresAt)"
                ),
                id,
                kind,
                subject,
                approver,
                human,
                expiresAt
            )
        );
        p.signature = _sign(key, _digest(e, h));
    }

    /// Fresh valid split approval from `approver` (each call has a new expiry, so a new digest).
    function _splitProof(ClippoEscrow e, uint256 id, address[] memory cs, uint256[] memory amts, address approver)
        internal
        returns (ClippoEscrow.HumanProof memory)
    {
        return _approval(
            e, id, 2, keccak256(abi.encode(cs, amts)), approver, keccak256(abi.encode("human", approver)),
            uint64(block.timestamp + 1 hours + (++_salt)), ATTESTOR_KEY
        );
    }

    function _campaignProof(ClippoEscrow e, uint256 id, address approver) internal view returns (ClippoEscrow.HumanProof memory) {
        return _approval(
            e, id, 1, bytes32(0), approver, keccak256(abi.encode("human", approver)), uint64(block.timestamp + 1 hours), ATTESTOR_KEY
        );
    }
}
