import { ethers } from 'ethers';

// ────────────────────────────────
//  Constants
// ────────────────────────────────

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

const ERC20_TRANSFER_EVENT = [
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

// ────────────────────────────────
//  Types
// ────────────────────────────────

export interface SendResult {
  success: boolean;
  hash?: string;
  error?: string;
}

export interface DepositEvent {
  from: string;
  to: string;
  amount: string;
  timestamp: string;
  txHash: string;
}

export interface WalletInfo {
  privateKey: string;
  address: string;
}

// ────────────────────────────────
//  Balance helpers
// ────────────────────────────────

/**
 * Get native token balance (ETH, BNB, etc.)
 */
export async function getNativeBalance(
  rpcUrl: string,
  walletAddress: string,
): Promise<string> {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const bal = await provider.getBalance(walletAddress);
  return bal.toString();
}

/**
 * Get ERC-20 token balance via eth_call
 */
export async function getERC20Balance(
  rpcUrl: string,
  tokenAddress: string,
  walletAddress: string,
): Promise<string> {
  const iface = new ethers.Interface(ERC20_ABI);
  const data = iface.encodeFunctionData('balanceOf', [walletAddress]);

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const result = await provider.call({ to: tokenAddress, data });
  return ethers.toBigInt(result).toString();
}

/**
 * Get ERC-20 token decimals
 */
export async function getERC20Decimals(
  rpcUrl: string,
  tokenAddress: string,
): Promise<number> {
  const iface = new ethers.Interface(ERC20_ABI);
  const data = iface.encodeFunctionData('decimals', []);

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const result = await provider.call({ to: tokenAddress, data });
  return Number(ethers.toBigInt(result));
}

// ────────────────────────────────
//  Formatting
// ────────────────────────────────

/**
 * Format raw wei balance → human-readable string
 */
export function formatTokenBalance(
  balanceWei: string,
  decimals: number = 18,
): string {
  if (!balanceWei || balanceWei === '0' || balanceWei === '0x0') return '0';
  try {
    return ethers.formatUnits(balanceWei, decimals);
  } catch {
    return '0';
  }
}

/**
 * Format native balance in wei → ETH
 */
export function formatNativeBalance(balanceWei: string): string {
  return formatTokenBalance(balanceWei, 18);
}

// ────────────────────────────────
//  Send transactions
// ────────────────────────────────

/**
 * Send ERC-20 token
 */
export async function sendErc20(
  rpcUrl: string,
  privateKey: string,
  tokenAddress: string,
  to: string,
  amount: string | number,
  decimals: number = 18,
): Promise<SendResult> {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);

    // Check token balance
    const balance = await contract.balanceOf(wallet.address);
    const amountBN = ethers.parseUnits(String(amount), decimals);
    if (balance < amountBN) return { success: false, error: 'Insufficient token balance' };

    // Check gas balance
    const ethBalance = await provider.getBalance(wallet.address);
    if (ethBalance < ethers.parseEther('0.0000001'))
      return { success: false, error: 'Not enough ETH for gas' };

    const tx = await contract.transfer(to, amountBN);
    return { success: true, hash: tx.hash };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Send native token (ETH, BNB, MATIC, etc.)
 */
export async function sendNativeToken(
  rpcUrl: string,
  privateKey: string,
  to: string,
  amount: string | number,
): Promise<SendResult> {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const value = ethers.parseEther(String(amount));

    const balance = await provider.getBalance(wallet.address);
    if (balance < value) return { success: false, error: 'Insufficient balance' };

    const tx = await wallet.sendTransaction({ to, value });
    return { success: true, hash: tx.hash };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ────────────────────────────────
//  Deposit history
// ────────────────────────────────

/**
 * Fetch ERC-20 Transfer events to the wallet in last 24h
 */
export async function getDepositHistory(
  tokenAddress: string,
  walletAddress: string,
  rpcUrl: string,
): Promise<DepositEvent[]> {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(tokenAddress, ERC20_TRANSFER_EVENT, provider);

    const currentBlock = await provider.getBlockNumber();
    const blocksAgo = Math.floor((24 * 60 * 60) / 13); // ~13s block time
    const fromBlock = currentBlock - blocksAgo;

    const filter = contract.filters.Transfer(null, walletAddress);
    const events = await contract.queryFilter(filter, fromBlock, currentBlock);

    const now = Math.floor(Date.now() / 1000);
    const dayAgo = now - 24 * 60 * 60;

    const results: DepositEvent[] = [];
    for (const evt of events) {
      const block = await provider.getBlock(evt.blockNumber);
      if (block && block.timestamp >= dayAgo) {
        results.push({
          from: (evt as ethers.EventLog).args[0],
          to: (evt as ethers.EventLog).args[1],
          amount: ((evt as ethers.EventLog).args[2] as bigint).toString(),
          timestamp: new Date(block.timestamp * 1000).toISOString(),
          txHash: evt.transactionHash,
        });
      }
    }
    return results;
  } catch {
    return [];
  }
}

// ────────────────────────────────
//  Wallet helpers
// ────────────────────────────────

/**
 * Generate a new hot wallet
 */
export function generateHotWallet(): WalletInfo {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
}
