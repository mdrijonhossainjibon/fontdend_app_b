import crypto from 'crypto';

export interface FingerprintData {
  ip: string;
  userAgent: string;
  acceptLanguage: string;
  acceptEncoding: string;
  timestamp: number;
}

export interface VerifyOptions {
  timestamp: string;
  hash: string;
  signature: string;
  secret: string;
  allowedDelay?: number;
}

export function verifyRequestSignature(options: VerifyOptions): { success: boolean; data?: FingerprintData } {
  const { timestamp, hash, signature, secret, allowedDelay = 5000 } = options;
  try {
    const now = Date.now();
    const ts = parseInt(timestamp, 10);
    if (isNaN(ts) || now - ts > allowedDelay) return { success: false };

    const hashDigest = crypto.createHash('sha256').update(hash + timestamp).digest('hex');
    const expectedSignature = crypto.createHmac('sha256', secret).update(hashDigest).digest('hex');
    if (expectedSignature.length !== signature.length) return { success: false };
    if (!crypto.timingSafeEqual(Buffer.from(expectedSignature, 'hex'), Buffer.from(signature, 'hex'))) {
      return { success: false };
    }

    const [ivHex, encryptedHex] = hash.split(':');
    if (!ivHex || !encryptedHex) return { success: false };

    const keyHash = crypto.createHash('sha256').update(secret).digest();
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyHash, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    const data = JSON.parse(decrypted.toString('utf-8'));

    return { success: true, data };
  } catch {
    return { success: false };
  }
}
