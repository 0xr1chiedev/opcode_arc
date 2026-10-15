// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Points ledger
/// @notice Points are scored off-chain from X engagement. Each epoch the operator publishes a Merkle root of
///         (wallet, earned) so presale commits can prove balances on-chain. Points are not transferable.
interface IPointsLedger {
    event RootPublished(bytes32 root, uint64 epoch);
    event Locked(address indexed wallet, uint256 amount);
    event Burned(address indexed wallet, uint256 amount);

    function publishRoot(bytes32 root, uint64 epoch) external;
    function lock(address wallet, uint256 amount, uint256 balance, bytes32[] calldata proof) external;
}
