import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { sendSuccess, sendError } from '@/utils/response';
import { connectDB } from '@/config';
import { Solution } from '@/models/Solution';

export const list = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();

  const { search, service, type, page = '1', limit = '20' } = req.query;

  const filter: any = {};

  if (service && service !== '') {
    filter.service = service;
  }
  if (type && type !== '') {
    filter.type = type;
  }
  if (search && search !== '') {
    filter.question = { $regex: String(search), $options: 'i' };
  }

  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [solutions, total] = await Promise.all([
    Solution.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
    Solution.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limitNum);

  const [serviceCounts, typeCounts] = await Promise.all([
    Solution.aggregate([{ $group: { _id: '$service', count: { $sum: 1 } } }]),
    Solution.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
  ]);

  const services: Record<string, number> = {};
  serviceCounts.forEach((s: any) => { if (s._id) services[s._id] = s.count; });

  const types: Record<string, number> = {};
  typeCounts.forEach((t: any) => { if (t._id) types[t._id] = t.count; });

  const stats = { total, services, types };

  sendSuccess(res, { solutions, stats, pagination: { total, totalPages, page: pageNum, limit: limitNum } });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();

  // Handle clear all
  if (req.query.clearAll === 'true') {
    const filter: any = {};
    if (req.query.service && String(req.query.service) !== '') {
      filter.service = String(req.query.service);
    }
    if (req.query.type && String(req.query.type) !== '') {
      filter.type = String(req.query.type);
    }
    await Solution.deleteMany(filter);
    sendSuccess(res, { message: 'Solutions cleared' });
    return;
  }

  // Handle single delete
  const { solutionId } = req.query;

  if (!solutionId || String(solutionId).trim() === '') {
    sendError(res, 400, 'solutionId is required');
    return;
  }

  const result = await Solution.findByIdAndDelete(String(solutionId));
  if (!result) {
    sendError(res, 404, 'Solution not found');
    return;
  }

  sendSuccess(res, { message: 'Deleted' });
});
