// TODO: Implement blockchain deposit history fetching
// This module provides functions to check deposit addresses on-chain

export async function getDepositHistory(
    tokenAddress: string,
    userAddress: string,
    rpcUrl: string
): Promise<Array<{ txHash: string; amount: string }>> {
    console.warn('getDepositHistory: Not fully implemented. Stub returning empty array.');
    return [];
}

export { getERC20Decimals, formatTokenBalance } from 'auth-fingerprint';
