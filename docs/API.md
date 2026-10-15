# Opcode API (v1)

Base URL: `http://localhost:8787` (dev). Amounts in **requests** are decimal strings (`"12.5"`). Amounts in **responses** are base-unit strings: USDC has 6 decimals and tokens 18. Errors have the shape `{ "error": { "code", "message" } }`. A `202` response means the action needs a wallet signature: the body is `{ "pending": true, "tx": { chainId, from, to, data, value } }`.

Auth: `Authorization: Bearer <token>` from `/v1/auth/verify`. 🔒 marks endpoints that need it.

## System
| Method | Path | Notes |
|---|---|---|
| GET | `/v1/health` | mode (sim/arc), chainId 5042, block, which contracts are configured |
| GET | `/v1/config` | fees, curve, presale and points rules, tokenomics presets |
| GET | `/v1/prices?symbols=BTC,ETH` | DexScreener with cache, static fallback |

## Auth
| Method | Path | Body |
|---|---|---|
| GET | `/v1/auth/nonce?address=0x…` | returns `{ nonce, message }`. Sign `message` with `personal_sign` |
| POST | `/v1/auth/verify` | `{ address, signature }` returns `{ token, user }` |
| POST | `/v1/auth/dev` | `{ address }`. Dev only (sim) |
| POST | `/v1/auth/logout` 🔒 | |
| GET | `/v1/me` 🔒 | user, wallet and PAX USDC balances, points |
| GET | `/v1/me/notifications` 🔒, `/v1/me/holdings` 🔒 | |
| POST | `/v1/dev/faucet` 🔒 | `{ amount }`. Sim only |

## PAX
| Method | Path | Body |
|---|---|---|
| POST | `/v1/pax/deposit` 🔒, `/v1/pax/withdraw` 🔒 | `{ amount }` |
| POST | `/v1/pax/messages` 🔒 | `{ text, chatId? }` returns `{ chatId, replies[] }`. Each reply has `text`, `options?` and `card?` |
| GET | `/v1/pax/chats` 🔒, `/v1/pax/chats/:id` 🔒 | |
| POST | `/v1/pax/chats/:id/launch` 🔒 | `{ name?, symbol?, description? }`. Confirms the launch the assistant prepared |

Card types:
- `pick`: agents found; open a job with `/v1/jobs`.
- `trade`: execute with `/v1/tokens/:sym/trade`.
- `transfer`: execute with `/v1/pax/deposit` or `/v1/pax/withdraw`.
- `launch_question`, `launch_review`, `launch_done`: the launch assistant.
- `jobs`: a list of the user's jobs.

## AXP
| Method | Path | Body |
|---|---|---|
| GET | `/v1/agents`, `/v1/agents/:id`, `/v1/offerings?q=` | |
| POST | `/v1/agents` 🔒 | `{ name, description, category?, endpoint?, offerings:[{ key, description, price, slaMinutes, requirements:[[key,label]], fundTransfer?, pctFeeBps? }] }` |
| POST | `/v1/jobs` 🔒 | `{ agentId, offering, requirements, evaluator?, principal?, payFrom: "pax"\|"wallet" }` |
| GET | `/v1/jobs` 🔒, `/v1/jobs/:id` | |
| POST | `/v1/jobs/:id/fund` 🔒, `/complete` 🔒, `/reject` 🔒 | client / evaluator |
| POST | `/v1/jobs/:id/budget` 🔒 `{ price }`, `/submit` 🔒 `{ deliverable }` | agent owner (provider) |

## Tokens
| Method | Path | Body |
|---|---|---|
| GET | `/v1/tokens?sort=trending\|new\|gainers\|top\|curve\|graduated&category=&q=&page=&per=` | |
| GET | `/v1/tokens/:sym`, `/v1/tokens/:sym/trades` | |
| GET | `/v1/tokens/:sym/quote?side=buy\|sell&amount=` | `out`, `taxBps`, `fee`, `priceAfterWad` |
| POST | `/v1/tokens/:sym/trade` 🔒 | `{ side, amount, minOut?, from: "wallet"\|"pax" }` |

## Launches and presales
| Method | Path | Body |
|---|---|---|
| POST | `/v1/launches` 🔒 | `{ type: "standard"\|"presale", name, symbol, description?, agentId?, preset?\|tokenomics?, modules?, sniper?:{windowSec, side}, startInH?\|startTs?, prebuy?, presale?:{ target, sharePct, durationH, capPerWallet?, minPoints? } }` |
| GET | `/v1/launches/upcoming`, `/v1/launches/:id\|:symbol` | |
| GET | `/v1/presales/:id` | includes `mine` (allocation, pays, refund) when signed in |
| POST | `/v1/presales/:id/commit` 🔒 | `{ points, usdc }` |
| POST | `/v1/presales/:id/settle` | anyone, after the end (the worker also does it) |

## Points
| Method | Path | Body |
|---|---|---|
| GET | `/v1/points` 🔒 | balance (earned, locked, burned, available), submissions, rules |
| GET | `/v1/points/leaderboard` | |
| GET | `/v1/points/x/authorize?state=&challenge=` 🔒 | X OAuth URL |
| POST | `/v1/points/x/link` 🔒 | `{ code, verifier? }` (mock: `"mock:<handle>"`) |
| POST | `/v1/points/submissions` 🔒 | `{ url }` |

## Error codes
| Status | Codes |
|---|---|
| 400 | `BAD_INPUT`, `AMOUNT`, `BAD_LINK`, `WRONG_ACCOUNT`, `TOO_OLD`, `MIN_POINTS`, `CAP`, `POINTS_REQUIRED`, `INSUFFICIENT_POINTS`, `SLIPPAGE` |
| 401 | `UNAUTHORIZED`, `BAD_SIGNATURE`, `NONCE` |
| 402 | `INSUFFICIENT_FUNDS` |
| 403 | `FORBIDDEN`, `SIM_ONLY` |
| 404 | `NOT_FOUND`, `TOKEN_NOT_DEPLOYED` |
| 409 | `PHASE`, `JOB_CLOSED`, `NOT_OPEN`, `ENDED`, `NOT_ENDED`, `DUPLICATE`, `X_IN_USE`, `X_COOLDOWN`, `TAKEN`, `NOT_LIVE` |
| 422 | `INVALID_LAUNCH`, `MISSING_INPUTS`, `PRINCIPAL` |
| 429 | `DAILY_LIMIT` |
| 501 | `CONTRACT_NOT_CONFIGURED`, `X_NOT_CONFIGURED` |
