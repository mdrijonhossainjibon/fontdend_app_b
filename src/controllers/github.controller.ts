import { Request, Response } from 'express';
import crypto from 'crypto';
import asyncHandler from '@/utils/asyncHandler';
import { User } from '@/models/User';
import { createTokens } from '@/services/jwt';
import { env } from '@/config/env';
import logger from '@/utils/logger';

function getCallbackUrl(req: Request): string {
  return `${req.protocol}://${req.get('host')}/api/auth/github/callback`;
}

export const initiate = asyncHandler(async (req: Request, res: Response) => {
  const stateToken = crypto.randomUUID();
  const callbackUrl = getCallbackUrl(req);

  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
  githubAuthUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  githubAuthUrl.searchParams.set('redirect_uri', callbackUrl);
  githubAuthUrl.searchParams.set('state', stateToken);
  githubAuthUrl.searchParams.set('scope', 'read:user user:email');

  res.cookie('oauth_state', stateToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600 * 1000,
    path: '/',
  });

  res.redirect(githubAuthUrl.toString());
});

export const callback = asyncHandler(async (req: Request, res: Response) => {
  const { code, state, error } = req.query;

  logger.info('GitHub callback received', { code: !!code, state, error, cookieState: req.cookies?.oauth_state, query: req.query });

  if (error) return res.redirect(env.FRONTEND_URL + '/auth/login?error=' + error);
  if (!state || state !== req.cookies?.oauth_state) {
    logger.warn('GitHub OAuth state mismatch', { state, cookieState: req.cookies?.oauth_state });
    return res.redirect(env.FRONTEND_URL + '/auth/login?error=invalid_state');
  }
  if (!code || typeof code !== 'string') return res.redirect(env.FRONTEND_URL + '/auth/login?error=no_code');

  const callbackUrl = getCallbackUrl(req);
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code, redirect_uri: callbackUrl }),
  });

  if (!tokenResponse.ok) return res.redirect(env.FRONTEND_URL + '/auth/login?error=oauth_failed');

  const tokenData = await tokenResponse.json() as any;
  if (!tokenData.access_token) return res.redirect(env.FRONTEND_URL + '/auth/login?error=no_access_token');

  const accessToken = tokenData.access_token;
  const userResponse = await fetch('https://api.github.com/user', {
    headers: { Authorization: 'Bearer ' + accessToken, Accept: 'application/json', 'User-Agent': 'CaptchaMaster-App' },
  });

  if (!userResponse.ok) return res.redirect(env.FRONTEND_URL + '/auth/login?error=user_fetch_failed');

  const githubUser = await userResponse.json() as any;
  const githubId = String(githubUser.id);
  let email = githubUser.email;

  if (!email) {
    try {
      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: 'Bearer ' + accessToken, Accept: 'application/json', 'User-Agent': 'CaptchaMaster-App' },
      });
      if (emailResponse.ok) {
        const emails = await emailResponse.json() as any[];
        const primary = emails.find((e: any) => e.primary && e.verified);
        if (primary) email = primary.email;
      }
    } catch {}
  }

  if (!email) return res.redirect(env.FRONTEND_URL + '/auth/login?error=no_email');

  const name = githubUser.name || githubUser.login || '';
  let user = await User.findOne({ email: email.toLowerCase() }) as any;

  if (user) {
    if (!user.oauthProvider) { user.oauthProvider = 'github'; user.oauthId = githubId; await user.save(); }
  } else {
    user = await User.create({ email: email.toLowerCase(), name, oauthProvider: 'github', oauthId: githubId, credits: 0, role: 'user' });
  }

  if (user.status === 'inactive') return res.redirect(env.FRONTEND_URL + '/auth/login?error=account_deactivated');

  const token = createTokens({ userId: user._id.toString(), email: user.email, role: user.role || 'user', credits: user.credits }).jwtToken;
  res.cookie('oauth_state', '', { maxAge: 0, path: '/' });
  res.redirect(env.FRONTEND_URL + '/dashboard?token=' + token);
});