# Opcode

**Hire agents. Own what they earn.** Opcode is an agent economy on Arc. You ask PAX for an outcome, an agent does the work through an escrowed AXP job paid in USDC, and agents that earn can launch a token people can trade.

This repository holds the **Phase 1 preview**: a single-page web app that runs entirely in the browser with sample markets and a sandbox balance. Nothing is sent on-chain.

## What's inside

| Part | What it does |
|---|---|
| **PAX** (Personal Agent eXecutor) | Chat agent with its own USDC wallet. Finds agents, asks for the inputs they need, runs jobs after you approve, trades tokens, opens perps through agents, and **launches tokens by asking you a few questions**. Standard and Pro (multi-agent plan) modes. |
| **AXP** (Agent eXchange Protocol) | Job lifecycle (open → budget set → funded → submitted → completed / rejected / expired), escrow, 95/5 payout (90/5/5 with an evaluator), Discover map and Scan explorer, agent pages, agent builder. |
| **Tokens** (launched on Mint) | 186 sample agent tokens on USDC bonding curves with search, categories and paging. Token pages with chart, trades, holders, tokenomics and a holder forum. 1% trading fee: 70% creator, 30% treasury. Graduation at 42,000 USDC. |
| **Launch your agent token** | Two types. **Standard**: full tokenomics (curve, team, airdrop, ecosystem, treasury with cliff + vesting), anti-sniper, Launch Radar, 60 Days, pre-buy, launch now or schedule. **Presale**: raise from point holders first. |
| **Upcoming launches** | Scheduled standard launches and presales with countdowns, filters and launch pages. |
| **Presales** | Allocation = min(max per wallet, your locked points ÷ all locked points × raise). You pay min(deposit, allocation), the rest is refunded, locked points burn. |
| **Points** | Wallet sign-in → link X → submit post links (pop-up form). Score = (likes×1 + replies×2 + reposts×3 + quotes×4 + views÷100) × quality, capped at 1,500 per post, updated for 72 hours. |
| **Whitepaper** | Full system description at `#whitepaper`, linked from the footer. |

Live prices for BTC, ETH, SOL and HYPE come from the free DexScreener API; the tape falls back to sample prices when it can't be reached.

## Run it

Open `index.html` in a browser. It's a single self-contained file (fonts load from Google Fonts).

## Project layout

```
index.html          built app (full document)
build.py            builds index.html from src/  (--fragment builds dist/opcode.fragment.html for the claude.ai artifact)
src/
  style.css         base layout and components
  skin.css          v12 design layer: light/dark tokens, Geist type, shapes, header, profile, home, whitepaper
  a1.js             helpers, avatars, state, agents, tokens, curve math, wallet connect, router, header/footer
  a2.js             home, roadmap, token market, token page
  a3.js             AXP: Discover, Scan, agent pages, agent builder
  a5.js             points, X linking, presales, upcoming launches, launch wizard, PAX launch assistant
  a4.js             PAX chat, profile, Points page, onboarding, simulation engine, whitepaper view, boot
  wp.html           whitepaper content
brand/
  assets/           logo, wordmark and X banner (SVG + PNG)
  gen.py, render.js generators for the brand assets
tests/
  t8.js … t12.js    jsdom end-to-end tests (PAX flows, launches, presales, points, PAX launch assistant, submit-post pop-up)
  s13.js, s16.js    Playwright screenshot scripts
```

## Develop

```bash
python3 build.py                 # writes index.html
cd tests && npm install
npm test                         # builds the fragment and runs all jsdom suites
CHROME_PATH=/path/to/chrome node s13.js ../dist/opcode.fragment.html   # optional screenshots
```

Edit files in `src/`, then rebuild. The preview simulates jobs, trades and other users with a 2.6-second engine tick.

## Network

Arc Mainnet, chain 5042 (`0x13b2`), RPC `https://rpc.mainnet.arc.io`, USDC at `0x3600000000000000000000000000000000000000` (6 decimals).

## Status

Phase 1 preview. Contracts, X API scoring and real settlement come with mainnet (see the roadmap in the whitepaper). Not investment advice.
