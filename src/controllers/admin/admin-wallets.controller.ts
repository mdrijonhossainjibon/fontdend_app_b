import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { sendSuccess, sendError } from '@/utils/response';
import { connectDB } from '@/config';
import { AdminWallet } from '@/models/AdminWallet';

export const list = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const wallets = await AdminWallet.find().sort({ createdAt: -1 }).lean();
  sendSuccess(res, { wallets });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const { address, network, label, symbol, isActive } = req.body;
  if (!address || !network || !label || !symbol) {
    sendError(res, 400, 'address, network, label, and symbol are required');
    return;
  }
  const existing = await AdminWallet.findOne({ address });
  if (existing) {
    sendError(res, 409, 'Wallet with this address already exists');
    return;
  }
  const wallet = await AdminWallet.create({ address, network, label, symbol, isActive });
  sendSuccess(res, { message: 'Wallet created', data: wallet }, 201);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const { id, address, network, label, symbol, isActive } = req.body;
  if (!id) {
    sendError(res, 400, 'id is required');
    return;
  }
  const updateData: any = {};
  if (address !== undefined) updateData.address = address;
  if (network !== undefined) updateData.network = network;
  if (label !== undefined) updateData.label = label;
  if (symbol !== undefined) updateData.symbol = symbol;
  if (isActive !== undefined) updateData.isActive = isActive;

  const wallet = await AdminWallet.findByIdAndUpdate(id, { $set: updateData }, { new: true });
  if (!wallet) {
    sendError(res, 404, 'Wallet not found');
    return;
  }
  sendSuccess(res, { message: 'Wallet updated', data: wallet });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const { id } = req.query;
  if (!id) {
    sendError(res, 400, 'id is required');
    return;
  }
  const wallet = await AdminWallet.findByIdAndDelete(String(id));
  if (!wallet) {
    sendError(res, 404, 'Wallet not found');
    return;
  }
  sendSuccess(res, { message: 'Wallet deleted' });
});
