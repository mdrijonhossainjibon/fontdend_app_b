import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { sendSuccess, sendError } from '@/utils/response';
import { connectDB } from '@/config';
import { DepositAddress } from '@/models/DepositAddress';

export const list = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();

  const { search, page = '1', limit = '20' } = req.query;

  const filter: any = {};

  if (search && search !== '') {
    filter.$or = [
      { cryptoId: { $regex: String(search), $options: 'i' } },
      { networkId: { $regex: String(search), $options: 'i' } },
      { address: { $regex: String(search), $options: 'i' } },
    ];
  }

  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [addresses, total] = await Promise.all([
    DepositAddress.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('userId', 'name email username')
      .lean(),
    DepositAddress.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limitNum);

  const addressesWithUser = (addresses as any[]).map((addr: any) => ({
    ...addr,
    user: addr.userId || null,
  }));

  sendSuccess(res, {
    depositAddresses: addressesWithUser,
    pagination: { total, totalPages, page: pageNum, limit: limitNum },
  });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();

  const { id, isActive } = req.body;

  if (!id) {
    sendError(res, 400, 'id is required');
    return;
  }

  const address = await DepositAddress.findByIdAndUpdate(
    id,
    { $set: { isActive } },
    { new: true }
  );

  if (!address) {
    sendError(res, 404, 'Deposit address not found');
    return;
  }

  sendSuccess(res, { address });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();

  const { id } = req.query;

  if (!id || String(id).trim() === '') {
    sendError(res, 400, 'id is required');
    return;
  }

  const result = await DepositAddress.findByIdAndDelete(String(id));
  if (!result) {
    sendError(res, 404, 'Deposit address not found');
    return;
  }

  sendSuccess(res, { message: 'Deleted' });
});

export const checkBalance = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();

  const { id } = req.body;

  if (!id) {
    sendError(res, 400, 'id is required');
    return;
  }

  const address = await DepositAddress.findById(id);
  if (!address) {
    sendError(res, 404, 'Deposit address not found');
    return;
  }

  sendSuccess(res, {
    id: address._id,
    balance: address.lastBalance || 0,
    cryptoId: address.cryptoId,
  });
});
