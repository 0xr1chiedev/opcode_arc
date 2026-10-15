import { createPublicClient, encodeFunctionData, http, keccak256, toHex, type Address, type Hex, type PublicClient } from 'viem';
import { DomainError } from '../../core/src/errors.ts';
import { ARC_MAINNET, arcChain, type OpcodeAddresses } from './arc.ts';
import { CURVE_FACTORY_ABI, ERC20_ABI, JOB_ESCROW_ABI, PAX_ACCOUNT_ABI, POINTS_LEDGER_ABI, PRESALE_VAULT_ABI } from './abi.ts';
import type { Asset, ChainAdapter, ChainIntent, ExecResult } from './adapter.ts';

const h32 = (s: unknown) => keccak256(toHex(String(s)));

/**
 * Arc mainnet adapter. Reads go to the RPC. Writes are never signed by the server: `execute` returns
 * an unsigned transaction for the user's wallet. Until a contract address is configured, the matching
 * action fails with CONTRACT_NOT_CONFIGURED (HTTP 501) so the API can tell the UI it is not live yet.
 */
export class ArcEvmChain implements ChainAdapter {
  readonly mode = 'arc' as const;
  readonly client: PublicClient;
  readonly addresses: OpcodeAddresses;
  private tokenAddress: (symbol: string) => Address | undefined;
  constructor(opts: { rpcUrl?: string; addresses: OpcodeAddresses; tokenAddress?: (symbol: string) => Address | undefined }) {
    this.client = createPublicClient({ chain: arcChain(opts.rpcUrl), transport: http(opts.rpcUrl ?? ARC_MAINNET.rpcUrl) }) as PublicClient;
    this.addresses = opts.addresses;
    this.tokenAddress = opts.tokenAddress ?? (() => undefined);
  }

  async blockNumber() { return Number(await this.client.getBlockNumber()); }

  async balanceOf(asset: Asset, account: string): Promise<bigint> {
    if (!/^0x[0-9a-fA-F]{40}$/.test(account)) throw new DomainError('NOT_ONCHAIN', `Account ${account} is a protocol account; read it from its contract.`, 501);
    const token = asset === 'USDC' ? ARC_MAINNET.usdc : this.tokenAddress(asset.slice(6));
    if (!token) throw new DomainError('TOKEN_NOT_DEPLOYED', `${asset} has no address on Arc yet.`, 404);
    return this.client.readContract({ address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [account as Address] });
  }

  private need(k: keyof OpcodeAddresses): Address {
    const a = this.addresses[k];
    if (!a) throw new DomainError('CONTRACT_NOT_CONFIGURED', `The ${k} contract is not deployed or configured yet.`, 501);
    return a;
  }

  /** Builds calldata for each intent. Arguments come from the API services. */
  encode(intent: ChainIntent): { to: Address; data: Hex } {
    const a = intent.args as Record<string, any>;
    switch (intent.kind) {
      case 'usdc.transfer': return { to: ARC_MAINNET.usdc, data: encodeFunctionData({ abi: ERC20_ABI, functionName: 'transfer', args: [a.to, a.amount] }) };
      case 'pax.deposit': return { to: this.need('paxAccountFactory'), data: encodeFunctionData({ abi: PAX_ACCOUNT_ABI, functionName: 'deposit', args: [a.amount] }) };
      case 'pax.withdraw': return { to: this.need('paxAccountFactory'), data: encodeFunctionData({ abi: PAX_ACCOUNT_ABI, functionName: 'withdraw', args: [a.amount] }) };
      case 'job.fund': return { to: this.need('jobEscrow'), data: encodeFunctionData({ abi: JOB_ESCROW_ABI, functionName: 'fund', args: [BigInt(a.chainJobId ?? 0)] }) };
      case 'job.release': return { to: this.need('jobEscrow'), data: encodeFunctionData({ abi: JOB_ESCROW_ABI, functionName: 'complete', args: [BigInt(a.chainJobId ?? 0)] }) };
      case 'job.refund': return { to: this.need('jobEscrow'), data: encodeFunctionData({ abi: JOB_ESCROW_ABI, functionName: 'reject', args: [BigInt(a.chainJobId ?? 0), h32(a.reason ?? '')] }) };
      case 'token.launch': return { to: this.need('curveFactory'), data: encodeFunctionData({ abi: CURVE_FACTORY_ABI, functionName: 'launch', args: [a.name, a.symbol, h32(a.metadata ?? ''), a.sharesPct, BigInt(Math.floor(a.startTs / 1000)), a.sniperWindow, a.sniperSells, a.prebuy] }) };
      case 'curve.buy': return { to: this.need('curveFactory'), data: encodeFunctionData({ abi: CURVE_FACTORY_ABI, functionName: 'buy', args: [this.tok(a.symbol), a.usdcIn, a.minOut ?? 0n] }) };
      case 'curve.sell': return { to: this.need('curveFactory'), data: encodeFunctionData({ abi: CURVE_FACTORY_ABI, functionName: 'sell', args: [this.tok(a.symbol), a.tokensIn, a.minOut ?? 0n] }) };
      case 'presale.commit': return { to: this.need('presaleVault'), data: encodeFunctionData({ abi: PRESALE_VAULT_ABI, functionName: 'commit', args: [BigInt(a.chainPresaleId ?? 0), a.points, a.usdc, a.proof ?? [], a.pointsBalance ?? 0n] }) };
      case 'presale.settle': return { to: this.need('presaleVault'), data: encodeFunctionData({ abi: PRESALE_VAULT_ABI, functionName: 'settle', args: [BigInt(a.chainPresaleId ?? 0)] }) };
      case 'points.publish': return { to: this.need('pointsLedger'), data: encodeFunctionData({ abi: POINTS_LEDGER_ABI, functionName: 'publishRoot', args: [a.root, BigInt(a.epoch)] }) };
    }
  }
  private tok(symbol: string): Address { const t = this.tokenAddress(symbol); if (!t) throw new DomainError('TOKEN_NOT_DEPLOYED', `$${symbol} has no address on Arc yet.`, 404); return t; }

  async execute(intent: ChainIntent, from: string): Promise<ExecResult> {
    if (!/^0x[0-9a-fA-F]{40}$/.test(from)) throw new DomainError('SIGNER', 'This action must be signed by a wallet.', 400);
    const { to, data } = this.encode(intent);
    return { status: 'needs_signature', tx: { chainId: ARC_MAINNET.id, from: from as Address, to, data, value: 0n } };
  }
}
