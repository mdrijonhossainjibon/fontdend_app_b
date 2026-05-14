import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import asyncHandler from '@/utils/asyncHandler';
import { sendSuccess } from '@/utils/response';
import { authMiddleware } from '@/middlewares/auth.middleware';

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
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10) }, // 50MB
});

const router = Router();

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
