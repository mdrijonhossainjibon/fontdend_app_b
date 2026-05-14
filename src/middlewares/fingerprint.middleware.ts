import { Request, Response, NextFunction } from 'express';
import { env } from '@/config/env';
import { verifyRequestSignature } from '@/utils/fingerprint';

export interface FingerprintRequest extends Request {
  fingerprint?: {
    ip: string;
    userAgent: string;
    acceptLanguage: string;
    acceptEncoding: string;
    timestamp: number;
  };
}

function getHeader(req: Request, names: string[]): string | undefined {
  for (const name of names) {
    const val = req.headers[name];
    if (val) return Array.isArray(val) ? val[0] : val;
  }
  return undefined;
}

export const fingerprintMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const signature = getHeader(req, ['x-auth-signature', 'auth-signature']);
  const timestamp = getHeader(req, ['x-auth-timestamp', 'auth-timestamp']);
  const hash = getHeader(req, ['x-auth-hash', 'auth-hash']);
  const fingerprintStr = getHeader(req, ['x-fingerprint', 'fingerprint']);

  // If no fingerprint headers present, pass through (non-browser clients, webhooks)
  if (!signature && !timestamp && !hash && !fingerprintStr) {
    return next();
  }

  // If any header is present but incomplete, reject
  if (!signature || !timestamp || !hash || !fingerprintStr) {
    res.status(401).json({ success: false, message: 'Incomplete authentication headers' });
    return;
  }

  const result = verifyRequestSignature({
    timestamp,
    hash,
    signature,
    secret: env.AUTH_FINGERPRINT_SECRET,
  });

  if (!result.success) {
    res.status(401).json({ success: false, message: 'Invalid request signature' });
    return;
  }

  (req as FingerprintRequest).fingerprint = result.data;
  next();
};
