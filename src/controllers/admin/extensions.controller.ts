import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { sendSuccess } from '@/utils/response';
import { connectDB } from '@/config';
import { Extension } from '@/models/Extension';
import path from 'path';
import fs from 'fs';

export const list = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const rawExtensions = await Extension.find().sort({ createdAt: -1 }).lean();

  const extensions = (rawExtensions || []).map((ext: any) => ({
    ...ext,
    downloadUrl: `${req.protocol}://${req.get('host')}/api/d/${ext.shortId || ext._id}`
  }));

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  sendSuccess(res, { extensions, total: extensions.length });
});

export const create = asyncHandler(async (req: any, res: Response) => {
  await connectDB();
  const file = req.file;
  const data = { ...req.body };

  if (!file) {
    return res.status(400).json({ success: false, message: 'Extension file is required' });
  }

  // Define paths
  const publicDir = path.resolve(process.cwd(), 'public/extensions');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  const fileName = `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
  const filePath = path.join(publicDir, fileName);

  // Save file from buffer to public folder
  fs.writeFileSync(filePath, file.buffer);

  // Set database fields
  data.fileSize = file.size;
  data.fileType = file.mimetype;
  data.originalName = file.originalname;
  data.fileName = fileName;
  data.downloadUrl = `/public/extensions/${fileName}`;

  // Validation
  if (!data.name) return res.status(400).json({ success: false, message: 'Name is required' });
  if (!data.version) return res.status(400).json({ success: false, message: 'Version is required' });

  const ext = await Extension.create(data);
  sendSuccess(res, { message: 'Extension created', data: ext }, 201);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const ext = await Extension.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
  sendSuccess(res, { message: 'Extension updated', data: ext });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  await Extension.findByIdAndDelete(req.params.id);
  sendSuccess(res, { message: 'Extension deleted' });
});

import AdmZip from 'adm-zip';

export const scan = asyncHandler(async (req: any, res: Response) => {
  const file = req.file;
  if (!file) return res.status(400).json({ success: false, message: 'No file uploaded' });

  let name = file.originalname.split('.')[0];
  let version = '1.0.0';
  let description = '';
  let platform = 'All';

  const extName = file.originalname.toLowerCase();
  if (extName.endsWith('.crx')) platform = 'Chrome';
  else if (extName.endsWith('.xpi')) platform = 'Firefox';
  else if (extName.endsWith('.zip')) platform = 'Chrome/Edge';
  else if (extName.endsWith('.exe')) platform = 'Windows';
  else if (extName.endsWith('.dmg')) platform = 'macOS';
  else if (extName.endsWith('.deb')) platform = 'Linux';

  try {
    const zip = new AdmZip(file.buffer);
    const zipEntries = zip.getEntries();
    const manifestEntry = zipEntries.find(entry => entry.entryName.endsWith('manifest.json'));

    if (manifestEntry) {
      const manifestData = JSON.parse(zip.readAsText(manifestEntry));
      name = manifestData.name || name;
      version = manifestData.version || version;
      description = manifestData.description || '';
      // If it's a browser extension manifest, it's likely for browser
      if (platform === 'All') platform = 'Chrome/Firefox';
    }
  } catch (err) {
    console.error('ZIP scan error:', err);
  }

  const data = {
    name,
    version,
    description,
    platform,
    changelog: `Initial release of ${name} v${version}`,
    releaseNote: `Fixed bugs and improved performance in v${version}`
  };

  sendSuccess(res, { message: 'Scan complete', data });
});
