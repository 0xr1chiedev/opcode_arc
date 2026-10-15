import { parseAbi } from 'viem';

/** ABIs for the Opcode contracts on Arc. They mirror contracts/interfaces/*.sol. */
export const ERC20_ABI = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
]);
export const JOB_ESCROW_ABI = parseAbi([
  'function createJob(address provider, address evaluator, bytes32 offering, bytes32 requirementsHash, uint256 principal, uint64 expiresAt) returns (uint256 jobId)',
  'function setBudget(uint256 jobId, uint256 price)',
  'function fund(uint256 jobId)',
  'function submit(uint256 jobId, bytes32 deliverableHash)',
  'function complete(uint256 jobId)',
  'function reject(uint256 jobId, bytes32 reason)',
  'function expire(uint256 jobId)',
  'event JobCreated(uint256 indexed jobId, address indexed client, address indexed provider, bytes32 offering)',
  'event JobPhase(uint256 indexed jobId, uint8 phase)',
]);
export const CURVE_FACTORY_ABI = parseAbi([
  'function launch(string name, string symbol, bytes32 metadataHash, uint16[6] sharesPct, uint64 startTs, uint32 sniperWindow, bool sniperSells, uint256 prebuy) returns (address token)',
  'function buy(address token, uint256 usdcIn, uint256 minTokensOut) returns (uint256 tokensOut)',
  'function sell(address token, uint256 tokensIn, uint256 minUsdcOut) returns (uint256 usdcOut)',
  'event Launched(address indexed token, address indexed creator, string symbol)',
  'event Trade(address indexed token, address indexed trader, bool isBuy, uint256 usdc, uint256 tokens, uint256 fee)',
  'event Graduated(address indexed token, address pool)',
]);
export const PRESALE_VAULT_ABI = parseAbi([
  'function create(address token, uint256 target, uint256 capPerWallet, uint16 shareBps, uint256 minPoints, uint64 startTs, uint64 endTs) returns (uint256 presaleId)',
  'function commit(uint256 presaleId, uint256 points, uint256 usdc, bytes32[] pointsProof, uint256 pointsBalance)',
  'function settle(uint256 presaleId)',
  'function claim(uint256 presaleId)',
  'event Committed(uint256 indexed presaleId, address indexed wallet, uint256 points, uint256 usdc)',
  'event Settled(uint256 indexed presaleId, uint256 filled, uint256 totalPoints)',
]);
export const POINTS_LEDGER_ABI = parseAbi([
  'function publishRoot(bytes32 root, uint64 epoch)',
  'function lock(address wallet, uint256 amount, uint256 balance, bytes32[] proof)',
  'event RootPublished(bytes32 root, uint64 epoch)',
]);
export const PAX_ACCOUNT_ABI = parseAbi([
  'function accountOf(address owner) view returns (address)',
  'function deposit(uint256 amount)',
  'function withdraw(uint256 amount)',
]);
