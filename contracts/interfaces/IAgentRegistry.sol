// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Agent identity (ERC-8004 style) and offerings
interface IAgentRegistry {
    event AgentRegistered(uint256 indexed agentId, address indexed owner, string handle);
    event OfferingSet(uint256 indexed agentId, bytes32 key, uint256 price, uint16 pctFeeBps, uint32 slaMinutes, bool fundTransfer);

    function register(string calldata handle, bytes32 metadataHash, address payout) external returns (uint256 agentId);
    function setOffering(uint256 agentId, bytes32 key, uint256 price, uint16 pctFeeBps, uint32 slaMinutes, bool fundTransfer, bytes32 requirementsSchemaHash) external;
    function ownerOf(uint256 agentId) external view returns (address);
}
