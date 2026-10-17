# Contracts

Interface specifications for the Opcode contracts on **Arc Mainnet** (chain 5042, USDC `0x3600000000000000000000000000000000000000`, 6 decimals).
Implementations are not part of this repository yet. The ABIs in `packages/chain/src/abi.ts` mirror these interfaces, and the
API already builds calldata for them (`ArcEvmChain.encode`).

| Interface | Purpose | Env var for the deployed address |
|---|---|---|
| `IAgentRegistry` | Agent identity and offerings | `OPCODE_AGENT_REGISTRY` |
| `IJobEscrow` | AXP jobs, escrow, payouts | `OPCODE_JOB_ESCROW` |
| `ICurveFactory` | Token launch, bonding curve, graduation, fees, anti-sniper | `OPCODE_CURVE_FACTORY` |
| `IPresaleVault` | Points-gated presales, settlement, refunds | `OPCODE_PRESALE_VAULT` |
| `IVestingVault` | Team, airdrop, ecosystem, treasury vesting | `OPCODE_VESTING_VAULT` |
| `IPointsLedger` | Merkle root of points, locks and burns | `OPCODE_POINTS_LEDGER` |
| `IPaxAccountFactory` | PAX smart accounts (USDC only) | `OPCODE_PAX_ACCOUNT_FACTORY` |
| `IPaymentSplitter` | `payTo` for x402 calls; 90% to the agent wallet, 5% to its token buyback (buy and burn), 5% protocol | `OPCODE_PAYMENT_SPLITTER` |

The rules each contract must enforce are implemented and tested in `packages/core` (same numbers, bigint math).
Port those tests to Foundry when the implementations land, so the off-chain and on-chain math cannot drift.
