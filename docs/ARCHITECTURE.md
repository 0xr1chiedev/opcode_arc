# Opcode system architecture

Opcode runs as if it were on **Arc Mainnet** from day one. Every amount is a bigint in base units: USDC has 6 decimals and tokens 18, the same as on-chain. Every movement of money is a chain intent, and every rule lives in one tested place.

## Layers

```
apps/web                 UI (preview today; talks to the API when OPCODE_CONFIG.apiBase is set)
   │  HTTPS + wallet signature
services/api             HTTP API, sessions, domain services, workers
   │                     ├─ uses packages/core for every rule
   │                     ├─ moves money only through packages/chain (ChainAdapter)
   │                     └─ reaches the outside world through packages/integrations
packages/core            pure domain logic, no I/O: money, curve, fees, anti-sniper, AXP jobs,
                         presales, points, tokenomics, launches, PAX intents + launch assistant
packages/chain           Arc config, contract ABIs, ChainAdapter
                         ├─ SimChain    in-memory ledger (dev + tests), atomic, no overdrafts
                         └─ ArcEvmChain viem; reads from RPC; writes return unsigned txs for the wallet
packages/integrations    XProvider (mock | X API v2), PriceFeed (DexScreener | static, cached),
                         AgentRuntime (queue for platform agents | signed webhooks for external agents)
contracts/interfaces     Solidity interfaces the ABIs mirror (implementations come later)
```

## How an action flows

1. The UI calls the API with a session token. The token comes from signing an EIP-4361-style message with the wallet (EIP-191); this is a signature only, with no transaction and no gas.
2. The service validates with `packages/core` and builds a **chain intent**: `{ kind, args, moves }`.
   - `args` is what the Opcode contract call needs.
   - `moves` are the asset transfers that result from the action.
3. `ChainAdapter.execute(intent, signer)` then runs in one of two modes:
   - **sim:** the ledger applies the moves atomically, the API updates state and returns `200`.
   - **arc:** the adapter encodes calldata and the API returns `202 { pending: true, tx }`. The UI has the wallet sign and send the transaction, and the indexer (see INTEGRATION.md) applies state when the contract event lands. Until a contract address is configured, the call fails with `501 CONTRACT_NOT_CONFIGURED`.
4. Workers run on an interval:
   - open scheduled launches,
   - settle presales,
   - re-score posts for 72 hours,
   - expire jobs,
   - in sim mode, drive the platform agents.

## Ledger accounts

| Account | Meaning |
|---|---|
| `0x…` | A user wallet |
| `pax:0x…` | The user's PAX account (USDC only; a smart account on Arc) |
| `escrow:job:ID` | AXP escrow for one job |
| `curve:SYM` | The bonding curve, and after graduation the pool |
| `vault:presale:ID` | Presale deposits |
| `vesting:SYM:bucket` | Team, airdrop, ecosystem and treasury allocations |
| `team:SYM` | Anti-sniper buyback |
| `treasury`, `protocol` | Fee sinks |
| `agent:ID` | Payout account for platform agents |

## Economics (all in `packages/core`, all tested)

- **Curve.** Virtual reserves X0 = 6,000 USDC and Y0 = 1.073B tokens, K = X0·Y0, price = (X0 + raised)² / K.
  - The curve is scaled to the launch's curve bucket, so every launch sells its bucket by exactly 42,000 USDC.
  - At graduation the pool is seeded at the same price.
  - On the reference curve the launch FDV is about $5.6K and the graduation FDV about $358K.
- **Trade fee:** 1% (100 bps), split 70% creator and 30% treasury.
- **Anti-sniper:** the tax falls linearly from 99% to 1% over the window. The part above 1% buys back to the team. Sells are taxed only on the 98-minute "both" setting.
- **AXP payout:** provider 95%, protocol 5%. With an evaluator: 90 / 5 / 5. Refunds return price plus principal.
- **Presale:**
  - allocation = min(cap, points / total × target)
  - paid = min(deposit, allocation); refund = deposit − paid
  - Points burn. The raise seeds the curve, and unsold presale tokens join the curve bucket.
  - Default cap is 2.1% of the raise.
- **Points per post:** (likes + 2·replies + 3·reposts + 4·quotes + views/100) × quality (0.5–1.5).
  - Capped at 1,500 per post and 10 posts a day.
  - Only posts from the last 7 days count, and scores are tracked for 72 hours.
  - The post ID's snowflake gives its timestamp.
- **Tokenomics:**
  - Shares are whole percents that sum to 100; the curve gets at least 20% and the team at most 25%; a presale gets 10–30%.
  - Vesting is linear after a cliff (30-day months).

## State

`services/api/src/store.ts` keeps state in memory with JSON snapshots (`STORE_FILE`). The `Store` interface is small (`state`, `nextId`, `save`), so it can be swapped for Postgres without touching the services. Chain balances are never stored in the API: they are read from the ledger, or on Arc from the contracts.

## Security model

- The server never holds user keys. On Arc every write is signed by the user's wallet.
- Sessions are random 256-bit tokens with a configurable TTL. Sign-in nonces expire after 10 minutes and work once.
- Role checks run on every job transition (client, provider owner, evaluator). Users can only launch tokens for their own agents.
- Slippage limits (`minOut`) are honoured on every trade, and failed simulated transactions change nothing.
- `ALLOW_DEV` (faucet, dev sign-in) is on by default only in sim mode.
