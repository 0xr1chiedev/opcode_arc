# What gets plugged in later

The system runs end to end today on the simulated Arc ledger. Each item below is a seam that already exists in the code; switching it on does not change the domain logic.

## 1. Contracts on Arc
- Implement `contracts/interfaces/*.sol`. The rules and numbers are in `packages/core`; port `packages/core/test/core.test.ts` to Foundry.
- Deploy to Arc Mainnet (chain 5042) and set the addresses in the environment (see `.env.example`), then run with `CHAIN_MODE=arc`.
- Endpoints that change state return `202 { pending, tx }`; endpoints whose contract is missing return `501 CONTRACT_NOT_CONFIGURED`.
- **Indexer (to build):** subscribe to `JobPhase`, `Trade`, `Graduated`, `Launched`, `Committed`, `Settled` and apply the same state updates the services apply after a `confirmed` result in sim mode. Mapping:

| Service function | Event(s) |
|---|---|
| `jobs.act` | `JobPhase` |
| `market.trade` | `Trade`, `Graduated` |
| `market.createToken` | `Launched` |
| `launch.commit` | `Committed` |
| `launch.settle` | `Settled` |

## 2. Wallet in the UI
- Today the preview's "Connect wallet" uses EIP-6963 discovery and `personal_sign` against a local message.
- To go live, sign the message from `GET /v1/auth/nonce` and call `POST /v1/auth/verify`. `OpcodeAPI.signIn(address, sign)` in `apps/web/src/a0.js` does exactly this.
- For `202` responses, send `tx` with `eth_sendTransaction` on chain `0x13b2`. USDC approvals to `CurveFactory`, `JobEscrow` and `PresaleVault` come first.

## 3. UI → API wiring
`apps/web/src/a0.js` exposes `window.OpcodeAPI` for every endpoint. Set `window.OPCODE_CONFIG = { apiBase }` or open the page with `?api=https://…`.

| UI area | Preview function | API | Status |
|---|---|---|---|
| Price tape | `fetchPrices` | `GET /v1/prices` | **wired** |
| Header badge | `.pv` | API reachable | **wired** |
| Sign-in | `openConnect`, `demoSession` | `/v1/auth/*` | client ready |
| Token list, token page, trades | `mintView`, `tokenView`, `execTrade` | `/v1/tokens*` | client ready |
| PAX chat | `paxView.respond`, cards | `/v1/pax/messages` (+ card endpoints) | client ready |
| AXP jobs, agents | `openJob`, `newJob`, `agentView`, `newAgentView` | `/v1/jobs*`, `/v1/agents*` | client ready |
| Launch wizard, PAX launch assistant | `createView`, `launchSpec` | `/v1/launches`, `/v1/pax/chats/:id/launch` | client ready |
| Upcoming launches, presales | `presalesStrip`, `presaleView`, `launchView` | `/v1/launches/upcoming`, `/v1/presales/*` | client ready |
| Points, submit post pop-up | `pointsPanel`, `submitPostModal`, `linkXModal` | `/v1/points*` | client ready |

## 4. X
- Set `X_MODE=api`, `X_CLIENT_ID`, `X_CLIENT_SECRET`, `X_REDIRECT_URI` and `X_BEARER_TOKEN`.
- `XApiProvider` implements OAuth 2.0 with PKCE (`authorizeUrl`, `completeAuth`) and post metrics through API v2 (`public_metrics`).
- Still to build in `quality()`: account age, follower quality, bot score.

## 5. Agents
- Platform agents run in the worker in sim mode.
- External agents register an `endpoint`. `WebhookAgentRuntime` posts `job.opened` with an `x-opcode-signature: sha256=<hmac>` header, and the agent answers through `/v1/jobs/:id/budget` and `/submit` with its owner's session or its own agent key (`Bearer ak_…`).
- x402 offerings call `runtime.invoke` (`{type:"x402.call"}`, same HMAC header) and expect `{ output }` back within the request.
- Full design: [AGENTS.md](AGENTS.md).

### x402 on Arc
1. Confirm Arc's USDC exposes EIP-3009 `transferWithAuthorization`, and read its EIP-712 `name()`/`version()`; set `X402_TOKEN_NAME` / `X402_TOKEN_VERSION`. A wrong domain makes every signature fail `verify`.
2. Deploy `IPaymentSplitter`, set `OPCODE_PAYMENT_SPLITTER`; it becomes `payTo` in every 402.
3. Fund a relayer key with a little USDC (gas) and set `X402_RELAYER_KEY`. Without it, Arc-mode settles return `501 X402_RELAYER_NOT_CONFIGURED`.
4. Set `PUBLIC_URL` so Agent Cards and 402 `resource.url` point at the public host.
5. Optional: swap the built-in facilitator for Circle Gateway (batched nanopayments) behind the same `verify`/`settle` interface.

## 6. PAX brain
- `packages/core/src/pax.ts` is a rule-based intent parser plus the launch assistant.
- An LLM planner can replace `parseIntent` (same `Intent` type). The launch questions and validation stay as they are, because they enforce the rules.

## 7. Storage
- Replace `MemoryStore` with a Postgres store that implements `Store` (`state`, `nextId`, `save`), or move each collection to its own table behind the same service functions.
- Points roots: each epoch, build a Merkle tree of `(wallet, earned)` and call `PointsLedger.publishRoot` (the `points.publish` intent is already encoded).
