// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Vesting for team, airdrop, ecosystem and treasury buckets
/// @notice Linear vesting after a cliff (months of 30 days). Airdrop buckets unlock a share at launch.
interface IVestingVault {
    function schedule(address token, bytes32 bucket, address beneficiary, uint256 amount, uint64 start, uint32 cliffMonths, uint32 months) external;
    function vested(address token, bytes32 bucket, uint64 at) external view returns (uint256);
    function release(address token, bytes32 bucket) external returns (uint256);
}
