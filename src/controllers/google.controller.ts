import { Request, Response } from 'express';
import crypto from 'crypto';
import asyncHandler from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { sendSuccess } from '@/utils/response';
import { User } from '@/models/User';
import { createTokens } from '@/services/jwt';
import { env } from '@/config/env';
import logger from '@/utils/logger';


function getCallbackUrl(req: Request) {
  return `${req.protocol}://${req.get('host')}/api/auth/callback/google`;
}


export const exchangeToken = asyncHandler(async (req: Request, res: Response) => {
  const { access_token, token } = req.body;
  let profile: any;

  if (access_token) {
    const userInfoRes = await fetch(
      'https://www.googleapis.com/oauth2/v1/userinfo?access_token=' + access_token,
    );

    if (!userInfoRes.ok) {
      logger.error('Google token verification failed', { status: userInfoRes.status });
      throw new ApiError(401, 'Invalid or expired Google access token');
    }

    profile = await userInfoRes.json();
  } else if (token) {
    const tokenInfoRes = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + token);

    if (!tokenInfoRes.ok) {
      logger.error('Google One Tap token verification failed', { status: tokenInfoRes.status });
      throw new ApiError(401, 'Invalid or expired Google ID token');
    }

    profile = await tokenInfoRes.json();
  } else {
    throw new ApiError(400, 'access_token or token is required');
  }

  const googleId = profile.sub || profile.id;
  const email = profile.email;
  const name = profile.name || profile.given_name || '';

  if (!email) throw new ApiError(400, 'Google account has no email');

  let user = await User.findOne({ email: email.toLowerCase() });

  if (user) {
    if (!user.oauthProvider) {
      user.oauthProvider = 'google';
      user.oauthId = googleId;
      await user.save();
    }
  } else {
    user = await User.create({
      email: email.toLowerCase(),
      name,
      oauthProvider: 'google',
      oauthId: googleId,
      balance: 0,
      role: 'user',
    });
  }

  if (!user.isActive) throw new ApiError(403, 'Account is deactivated');

  const { jwtToken } = createTokens({
    userId: user._id.toString(),
    email: user.email,
    role: user.role || 'user',
    balance: user.balance,
  });

  sendSuccess(res, {
    token: jwtToken,
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      balance: user.balance,
      role: user.role || 'user',
    },
  });
});

export const initiate = asyncHandler(async (req, res) => {
  const stateToken = crypto.randomUUID();
  const callbackUrl = getCallbackUrl(req);

  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  googleAuthUrl.searchParams.set('redirect_uri', callbackUrl);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'openid email profile');
  googleAuthUrl.searchParams.set('state', stateToken);
  googleAuthUrl.searchParams.set('access_type', 'offline');
  googleAuthUrl.searchParams.set('prompt', 'consent');

  res.cookie('oauth_state', stateToken, {
    httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax',
    maxAge: 6000 * 1000, path: '/',
  });
 
  res.redirect(googleAuthUrl.toString());
});

export const callback = asyncHandler(async (req, res) => {
  const { code, state, error } = req.query;

  logger.info('Google callback received', { code: !!code, state, error, cookieState: req.cookies?.oauth_state, query: req.query });

  if (error) return res.redirect(env.FRONTEND_URL + '/auth/login?error=' + error);
  if (!state || state !== req.cookies?.oauth_state) return res.redirect(env.FRONTEND_URL + '/auth/login?error=invalid_state');
  if (!code || typeof code !== 'string') return res.redirect(env.FRONTEND_URL + '/auth/login?error=no_code');

  const callbackUrl = getCallbackUrl(req);
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: callbackUrl, grant_type: 'authorization_code',
    }),
  });

  if (!tokenResponse.ok) return res.redirect(env.FRONTEND_URL + '/auth/login?error=oauth_failed');

  const tokenData: any = await tokenResponse.json();
  if (!tokenData.id_token) return res.redirect(env.FRONTEND_URL + '/auth/login?error=no_id_token');

  const payload = JSON.parse(Buffer.from(tokenData.id_token.split('.')[1], 'base64').toString());
  const googleId = payload.sub;
  const email = payload.email;
  const name = payload.name || payload.given_name || '';

  if (!email) return res.redirect(env.FRONTEND_URL + '/auth/login?error=no_email');
  let user = await User.findOne({ email: email.toLowerCase() });

  if (user) {
    if (!user.oauthProvider) {
      user.oauthProvider = 'google';
      user.oauthId = googleId;
      await user.save();
    }
  } else {
    user = await User.create({
      email: email.toLowerCase(), name, oauthProvider: 'google', oauthId: googleId,
      balance: 0, role: 'user',
    });
  }

  if (!user.isActive) return res.redirect(env.FRONTEND_URL + '/auth/login?error=account_deactivated');

  const token = createTokens({ userId: user._id.toString(), email: user.email, role: user.role || 'user', balance: user.balance }).jwtToken;
  res.cookie('oauth_state', '', { maxAge: 0, path: '/' });

  res.redirect(env.FRONTEND_URL + '/dashboard?token=' + token);
});
