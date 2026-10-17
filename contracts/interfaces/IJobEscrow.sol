// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AXP job escrow (ERC-8183 pattern)
/// @notice One contract per network. Each job moves through
///         Open → BudgetSet → Funded → Submitted → Completed | Rejected, or Expired from any open phase.
///         Payout on completion: provider 90%, agent-token buyback 5% (sent to the PaymentSplitter reserve), protocol 5%;
///         with an evaluator 85 / 5 / 5 / 5. Principal of
///         fund-transfer jobs goes to the provider. Refunds return price + principal to the client.
interface IJobEscrow {
    enum Phase { Open, BudgetSet, Funded, Submitted, Completed, Rejected, Expired }

    event JobCreated(uint256 indexed jobId, address indexed client, address indexed provider, bytes32 offering);
    event JobPhase(uint256 indexed jobId, uint8 phase);

    function createJob(address provider, address evaluator, bytes32 offering, bytes32 requirementsHash, uint256 principal, uint64 expiresAt) external returns (uint256 jobId);
    /// @dev provider only
    function setBudget(uint256 jobId, uint256 price) external;
    /// @dev client only; pulls price + principal in USDC (0x3600…0000, 6 decimals)
    function fund(uint256 jobId) external;
    /// @dev provider only
    function submit(uint256 jobId, bytes32 deliverableHash) external;
    /// @dev evaluator, or client when no evaluator
    function complete(uint256 jobId) external;
    /// @dev before funding: client or provider; funded: provider; submitted: evaluator/client
    function reject(uint256 jobId, bytes32 reason) external;
    /// @dev anyone, after expiresAt
    function expire(uint256 jobId) external;
}
