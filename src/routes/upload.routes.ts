import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import asyncHandler from '@/utils/asyncHandler';
import { sendSuccess } from '@/utils/response';
import { authMiddleware } from '@/middlewares/auth.middleware';

import { API_CALL } from 'auth-fingerprint';

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || './uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '524288000', 10) }, // Increased to 500MB
});

const router = Router();

// Forward model to bot endpoint
// @ts-ignore
router.post('/model-to-bot', authMiddleware, upload.single('file'), asyncHandler(async (req, res) => {
  const file = req.file;
  const { botUrl } = req.body; // Expecting full bot upload URL from frontend

  if (!file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  if (!botUrl) {
    return res.status(400).json({ success: false, message: 'No bot URL provided' });
  }

  try {
    const url = new URL(botUrl);
    const { default: FormData } = await import('form-data');
    const form = new FormData();
    form.append('file', fs.createReadStream(file.path), {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    const formHeaders = form.getHeaders();

    // Forward to bot endpoint using auth-fingerprint API_CALL
    const response = await API_CALL({
      method: 'POST',
      url: url.pathname + url.search,
      baseURL: url.origin,
      body: form,
      headers: {
        ...(formHeaders as Record<string, string>),
      },
    });

    // Clean up uploaded file
    fs.unlinkSync(file.path);

    res.json({
      success: true,
      message: 'Model forwarded to bot successfully',
      botResponse: response.response,
    });
  } catch (error: any) {
    // Clean up on error
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

    console.error('Forwarding error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to forward model to bot',
      error: error.message,
    });
  }
}));

// @ts-ignore
router.post('/', authMiddleware, upload.single('file'), asyncHandler(async (req, res) => {
  const file = req.file;
  if (!file) {
    return sendSuccess(res, { message: 'No file uploaded', file: null });
  }
  sendSuccess(res, {
    message: 'File uploaded successfully',
    file: {
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: `/uploads/${file.filename}`,
    },
  });
}));

// @ts-ignore
router.post('/multiple', authMiddleware, upload.array('files', 10), asyncHandler(async (req, res) => {
  const files = req.files as Express.Multer.File[];
  if (!files?.length) {
    return sendSuccess(res, { message: 'No files uploaded', files: [] });
  }
  sendSuccess(res, {
    message: `${files.length} file(s) uploaded successfully`,
    files: files.map((f) => ({
      filename: f.filename,
      originalname: f.originalname,
      mimetype: f.mimetype,
      size: f.size,
      path: `/uploads/${f.filename}`,
    })),
  });
}));

export default router;
