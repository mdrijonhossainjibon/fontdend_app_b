import { Request, Response } from 'express';
import { DepositAddress } from '@/models/DepositAddress';
import { CryptoConfig } from '@/models/CryptoConfig';
import { AdminWallet } from '@/models/AdminWallet';
import { AuthRequest } from '@/middlewares/auth.middleware';
import asyncHandler from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { sendSuccess } from '@/utils/response';
import { connectDB } from '@/config';
import {
  sendErc20, sendNativeToken, getERC20Decimals, getERC20Balance, getNativeBalance,
  formatTokenBalance, formatNativeBalance,
} from 'auth-fingerprint';

async function getGasPrice(rpcUrl: string): Promise<bigint> {
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_gasPrice', params: [], id: 1 }),
    });
    const data: any = await response.json();
    if (data.error) throw new Error(data.error.message);
    return BigInt(data.result);
  } catch {
    return BigInt(0);
  }
}

export const sweepCrypto = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user.role !== 'admin') throw ApiError.unauthorized();
  await connectDB();

  const { addressIds, masterWalletId } = req.body;
  if (!addressIds || !Array.isArray(addressIds)) throw ApiError.badRequest('addressIds array is required');

  const results = [];
  let explicitMasterWallet: any = null;
  if (masterWalletId) explicitMasterWallet = await AdminWallet.findById(masterWalletId);

  for (const id of addressIds) {
    const depAddr = await DepositAddress.findById(id);
    if (!depAddr) continue;

    const config = await CryptoConfig.findOne({ id: depAddr.cryptoId });
    if (!config) continue;

    const network = config.networks.find((n: any) => n.id === depAddr.networkId);
    if (!network || !network.rpcUrl) continue;

    let masterWallet: any = null;
    if (explicitMasterWallet && explicitMasterWallet.network === depAddr.networkId) masterWallet = explicitMasterWallet;
    else masterWallet = await AdminWallet.findOne({ network: depAddr.networkId, isActive: true });

    if (!masterWallet) {
      results.push({ id, address: depAddr.address, status: 'error', networkId: depAddr.networkId, message: `No active master wallet found for network ${depAddr.networkId}` });
      continue;
    }

    try {
      const rpcUrl = network.rpcUrl;
      const isToken = !!network.address;
      let balanceWei: bigint;
      let decimals = 18;

      if (isToken) {
        const [rawBalance, tokenDecimals] = await Promise.all([
          getERC20Balance(rpcUrl, network.address!, depAddr.address),
          getERC20Decimals(rpcUrl, network.address!),
        ]);
        balanceWei = BigInt(rawBalance);
        decimals = tokenDecimals;
      } else {
        const rawBalance = await getNativeBalance(rpcUrl, depAddr.address);
        balanceWei = BigInt(rawBalance);
      }

      if (balanceWei === BigInt(0)) {
        results.push({ id, address: depAddr.address, status: 'skipped', message: 'Zero balance' });
        continue;
      }

      const rawNativeBalance = await getNativeBalance(rpcUrl, depAddr.address);
      const nativeBalanceWei = BigInt(rawNativeBalance);
      const gasPrice = await getGasPrice(rpcUrl);
      const bufferedGasPrice = (gasPrice * BigInt(120)) / BigInt(100);
      const gasLimit = isToken ? BigInt(100000) : BigInt(21000);
      const estimatedGasCost = bufferedGasPrice * gasLimit;

      if (nativeBalanceWei < estimatedGasCost) {
        results.push({ id, address: depAddr.address, status: 'need_gas', requiredGas: formatNativeBalance(estimatedGasCost.toString()), currentGas: formatNativeBalance(rawNativeBalance), message: `Insufficient gas. Need approx ${formatNativeBalance(estimatedGasCost.toString())} native coins.` });
        continue;
      }

      let sendRes: any;
      if (isToken) {
        const amountToHuman = formatTokenBalance("0x" + balanceWei.toString(16), decimals);
        sendRes = await sendErc20(rpcUrl, depAddr.privateKey, network.address!, masterWallet.address, amountToHuman, decimals);
      } else {
        const amountToSendWei = balanceWei - estimatedGasCost;
        if (amountToSendWei <= BigInt(0)) {
          results.push({ id, address: depAddr.address, status: 'error', message: 'Balance too low to cover gas' });
          continue;
        }
        sendRes = await sendNativeToken(rpcUrl, depAddr.privateKey, masterWallet.address, formatNativeBalance(amountToSendWei.toString()));
      }

      if (sendRes.success) {
        results.push({ id, address: depAddr.address, status: 'success', txHash: sendRes.hash || sendRes.result || sendRes.txHash, message: 'Withdrawal initiated' });
      } else {
        results.push({ id, address: depAddr.address, status: 'error', message: sendRes.error || sendRes.result || 'Unknown error' });
      }
    } catch (err: any) {
      results.push({ id, address: depAddr.address, status: 'error', message: err.message });
    }
  }

  sendSuccess(res, { results });
});
