import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { sendSuccess } from '@/utils/response';
import { connectDB } from '@/config';
import { BotEndpoint } from '@/models/BotEndpoint';

export const list = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const endpoints = await BotEndpoint.find().sort({ createdAt: -1 }).lean();
  sendSuccess(res, { endpoints });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const { botName, endpoint, port, protocol, isActive } = req.body;
  if (!botName || !endpoint) throw new ApiError(400, 'Bot name and endpoint are required');

  const doc = await BotEndpoint.create({
    botName,
    endpoint,
    port: port || 80,
    protocol: protocol || 'http',
    isActive: isActive !== undefined ? isActive : true
  });
  sendSuccess(res, { message: 'Bot endpoint created', endpoint: doc }, 201);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const { botName, endpoint: endpointUrl, port, protocol, isActive } = req.body;
  const updateData: any = {};
  if (botName !== undefined) updateData.botName = botName;
  if (endpointUrl !== undefined) updateData.endpoint = endpointUrl;
  if (port !== undefined) updateData.port = port;
  if (protocol !== undefined) updateData.protocol = protocol;
  if (isActive !== undefined) updateData.isActive = isActive;

  const endpoint = await BotEndpoint.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true });
  if (!endpoint) throw new ApiError(404, 'Bot endpoint not found');
  sendSuccess(res, { message: 'Bot endpoint updated', endpoint });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const endpoint = await BotEndpoint.findByIdAndDelete(req.params.id);
  if (!endpoint) throw new ApiError(404, 'Bot endpoint not found');
  sendSuccess(res, { message: 'Bot endpoint deleted' });
});

export const testEndpoint = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const endpoint = await BotEndpoint.findById(req.params.id);
  if (!endpoint) throw new ApiError(404, 'Bot endpoint not found');

  try {
    const ep = endpoint as any;
    const response = await fetch(ep.url || `${endpoint.protocol}://${endpoint.endpoint}:${endpoint.port}`, {
      method: ep.method || 'POST',
      headers: { 'Content-Type': 'application/json', ...(ep.headers || {}) },
      body: ep.body ? JSON.stringify(ep.body) : undefined,
    });
    sendSuccess(res, { status: response.status, ok: response.ok, statusText: response.statusText });
  } catch (err: any) {
    sendSuccess(res, { status: 0, ok: false, error: err.message });
  }
});
