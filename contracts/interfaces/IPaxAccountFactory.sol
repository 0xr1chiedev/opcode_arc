// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PAX accounts
/// @notice One smart account per user that holds only USDC. It can fund AXP jobs and trade on the curve,
///         only for actions the owner approved; the owner can withdraw at any time.
interface IPaxAccountFactory {
    function accountOf(address owner) external view returns (address);
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
}
