import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { sendSuccess } from '@/utils/response';
import { connectDB } from '@/config';

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

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

    const response = await axios.post(botUrl, form, {
      headers: {
        ...form.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    res.json({
      success: true,
      message: 'Model uploaded and forwarded successfully',
      botResponse: response.data,
    });
  } catch (error: any) {
    console.error('Forwarding error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to forward model to bot',
      error: error.response?.data || error.message,
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
