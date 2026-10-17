// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title x402 payment splitter
/// @notice `payTo` of every x402 payment requirement. The facilitator's relayer settles the caller's
///         EIP-3009 `transferWithAuthorization` (USDC 0x3600…0000) into this contract, then calls `forward`
///         in the same transaction batch: 90% to the agent's wallet, 5% to the agent's buyback reserve, 5% to the protocol.
///         `buyback` spends a reserve on the agent's token through the CurveFactory and burns what it buys;
///         an agent without a token keeps accruing its reserve until it launches one.
///         `paymentNonce` is the EIP-3009 nonce, so one authorization can be forwarded only once.
interface IPaymentSplitter {
    event Forwarded(address indexed agent, uint256 amount, uint256 agentShare, uint256 protocolShare, bytes32 indexed paymentNonce);

    /// @dev relayer only; reverts if paymentNonce was already forwarded or the balance is short
    function forward(address agent, uint256 amount, bytes32 paymentNonce) external;
    event BoughtBack(address indexed agent, address indexed token, uint256 usdcIn, uint256 tokensBurned);

    /// @dev keeper or relayer; reverts if the agent has no live token
    function buyback(address agent, address token, uint256 usdcIn, uint256 minTokensOut) external;
    function buybackReserve(address agent) external view returns (uint256);
    function protocolBps() external view returns (uint16); // 500
    function buybackBps() external view returns (uint16); // 500
    function relayer() external view returns (address);
    function forwarded(bytes32 paymentNonce) external view returns (bool);
}
