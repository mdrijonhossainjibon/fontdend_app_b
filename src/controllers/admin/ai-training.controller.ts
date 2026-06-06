import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { sendSuccess } from '@/utils/response';
import { connectDB } from '@/config';

import { API_CALL } from 'auth-fingerprint';
import FormData from 'form-data';

export const uploadModelToBot = asyncHandler(async (req: any, res: any) => {
  const file = req.file;
  const { botUrl } = req.body;

  if (!file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  if (!botUrl) {
    return res.status(400).json({ success: false, message: 'No bot URL provided' });
  }

  try {
    const form = new FormData();
    form.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    const url = new URL(botUrl);
    const result = await API_CALL({
      method: 'POST',
      url: url.pathname + url.search,
      baseURL: url.origin,
      body: form,
      headers: {
        ...(form.getHeaders() as Record<string, string>),
      },
    });

    if (result.status >= 400) {
      const errMsg = typeof result.response === 'object'
        ? (result.response as any)?.message || (result.response as any)?.error || JSON.stringify(result.response)
        : String(result.response || 'Unknown bot error');
      return res.status(502).json({
        success: false,
        message: 'Failed to forward model to bot',
        error: errMsg,
      });
    }

    res.json({
      success: true,
      message: 'Model uploaded and forwarded successfully',
      botResponse: typeof result.response === 'object' ? JSON.stringify(result.response) : result.response,
    });
  } catch (error: any) {
    console.error('Forwarding error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to forward model to bot',
      error: error.message,
    });
  }
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  sendSuccess(res, { aiTrainings: [], total: 0 });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  sendSuccess(res, { message: 'AI Training created', data: req.body }, 201);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  sendSuccess(res, { message: 'AI Training updated', data: req.body });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  sendSuccess(res, { message: 'AI Training deleted' });
});
