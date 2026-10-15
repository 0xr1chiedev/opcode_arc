// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Points-gated presale vault
/// @notice allocation = min(capPerWallet, points / totalPoints × target); paid = min(deposit, allocation);
///         refund = deposit − paid. Locked points burn at settlement. Unfilled allocation goes to the curve.
///         The raise seeds the bonding curve and trading opens.
interface IPresaleVault {
    event Committed(uint256 indexed presaleId, address indexed wallet, uint256 points, uint256 usdc);
    event Settled(uint256 indexed presaleId, uint256 filled, uint256 totalPoints);

    function create(address token, uint256 target, uint256 capPerWallet, uint16 shareBps, uint256 minPoints, uint64 startTs, uint64 endTs) external returns (uint256 presaleId);
    /// @param pointsProof Merkle proof of the wallet's points balance in the latest PointsLedger root
    function commit(uint256 presaleId, uint256 points, uint256 usdc, bytes32[] calldata pointsProof, uint256 pointsBalance) external;
    function settle(uint256 presaleId) external;
    /// @notice pull tokens and refund after settlement
    function claim(uint256 presaleId) external;
}
