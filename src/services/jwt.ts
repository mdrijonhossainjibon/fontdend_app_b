import { SignJWT, jwtVerify } from 'jose';
import jwt from 'jsonwebtoken';
import { Response } from 'express';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-fallback-secret');
const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as string & jwt.SignOptions['expiresIn'];

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  [key: string]: any;
}

// Create jose token (for cookies - browser clients)
export async function createJoseToken(payload: TokenPayload): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(SECRET);
}

// Verify jose token
export async function verifyJoseToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

// Create jsonwebtoken (for Bearer header - API clients)
export function createJwtToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify jsonwebtoken
export function verifyJwtToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

// Unified create - returns both token formats
export function createTokens(payload: TokenPayload) {
  return {
    joseToken: jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN }),
    jwtToken: jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN }),
  };
}

// Unified verify - tries both jose and jsonwebtoken
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  // Try jsonwebtoken first (most common for API clients)
  let payload = verifyJwtToken(token);
  if (payload) return payload;

  // Try jose (for legacy browser clients)
  payload = await verifyJoseToken(token);
  if (payload) return payload;

  return null;
}

// Set auth cookie (Express response)
export function setAuthCookie(res: Response, token: string) {
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

// Remove auth cookie
export function removeAuthCookie(res: Response) {
  res.cookie('auth_token', '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
  });
}
