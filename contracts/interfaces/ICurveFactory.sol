// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Agent token launches and the USDC bonding curve
/// @notice Supply 1,000,000,000 (18 decimals). Curve: constant product with virtual reserves
///         X0 = 6,000 USDC, Y0 = 1,073,000,000 tokens, scaled to the launch's curve bucket.
///         Graduation at 42,000 USDC raised: liquidity moves to a pool and LP is locked for 10 years.
///         Every trade pays 1% (70% creator, 30% treasury). Anti-sniper tax falls 99% → 1% linearly over
///         0 s / 60 s / 10 min / 98 min; the part above 1% buys back to the team wallet (3-month cliff, 9-month vest).
interface ICurveFactory {
    event Launched(address indexed token, address indexed creator, string symbol);
    event Trade(address indexed token, address indexed trader, bool isBuy, uint256 usdc, uint256 tokens, uint256 fee);
    event Graduated(address indexed token, address pool);

    /// @param sharesPct [presale, curve, team, airdrop, ecosystem, treasury], whole percent, sum 100, curve ≥ 20, team ≤ 25
    function launch(string calldata name, string calldata symbol, bytes32 metadataHash, uint16[6] calldata sharesPct, uint64 startTs, uint32 sniperWindow, bool sniperSells, uint256 prebuy) external returns (address token);
    function buy(address token, uint256 usdcIn, uint256 minTokensOut) external returns (uint256 tokensOut);
    function sell(address token, uint256 tokensIn, uint256 minUsdcOut) external returns (uint256 usdcOut);
}
