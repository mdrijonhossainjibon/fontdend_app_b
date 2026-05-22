import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { sendSuccess } from '@/utils/response';
import { User } from '@/models/User';
import { OTP } from '@/models/OTP';
import { ApiKey } from '@/models/ApiKey';
import { PasswordReset } from '@/models/PasswordReset';
import { createTokens } from '@/services/jwt';
import { generateOTP, sendOTPEmail, sendPasswordResetEmail } from '@/services/email';
import { logActivity } from '@/services/activity';
import { Referral } from '@/models/Referral';

const generateReferralCode = (name: string): string => {
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${base.substring(0, 8)}_${suffix}`;
};

const getClientIp = (req: Request): string =>
  req.header('x-forwarded-for')?.split(',')[0] || req.header('x-real-ip') || req.ip || '127.0.0.1';

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) throw new ApiError(400, 'Email and password are required');

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) throw new ApiError(401, 'Invalid email or password');
  if (user.status === 'inactive') throw new ApiError(403, 'Account is deactivated. Please contact support.');

  const isValid = await user.comparePassword(password);
  if (!isValid) throw new ApiError(401, 'Invalid email or password');

  // 2FA check
  if (user.twoFactorEnabled) {
    const otpCode = generateOTP();
    await OTP.deleteMany({ email: user.email });
    await OTP.create({ email: user.email, otp: otpCode, expiresAt: new Date(Date.now() + 5 * 60 * 1000) });
    await sendOTPEmail({ email: user.email, otp: otpCode, name: user.name });
    return sendSuccess(res, { requiresOTP: true, message: 'OTP sent to your email', email: user.email });
  }

  const token = createTokens({ userId: user._id.toString(), email: user.email, role: user.role || 'user', balance: user.balance }).jwtToken;

  sendSuccess(res, {
    requiresOTP: false,
    token,
    user: { id: user._id, email: user.email, name: user.name, balance: user.balance, role: user.role || 'user' },
  });
});

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) throw new ApiError(400, 'Name, email, and password are required');
  if (password.length < 8) throw new ApiError(400, 'Password must be at least 8 characters');
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password))
    throw new ApiError(400, 'Password must contain at least one uppercase letter, one lowercase letter, and one number');

  const emailLower = email.toLowerCase();
  const existing = await User.findOne({ email: emailLower });
  if (existing) throw new ApiError(409, 'An account with this email already exists');

  const currentIp = getClientIp(req);

  // Handle referral
  let referredBy;
  if (req.body.referralCode) {
    const referrer = await User.findOne({ referralCode: req.body.referralCode });
    if (referrer) {
      referredBy = referrer._id;
    }
  }

  const referralCode = generateReferralCode(name);
  const user = await User.create({ name, email: emailLower, password, twoFactorEnabled: false, balance: 0, status: 'active', role: 'user', lastLoginIp: currentIp, referralCode, referredBy });

  // Create referral record
  if (referredBy) {
    await Referral.create({
      referrerUserId: referredBy,
      referredUserId: user._id,
      status: 'active',
      commissionEarned: 0,
    });
  }

  // Generate default API key
  const keyExists = await ApiKey.findOne({ userId: user._id });
  if (!keyExists) {
    await ApiKey.create({
      userId: user._id, name: 'Default Key',
      key: `pk_live_${Buffer.from(Math.random().toString(36).substring(2) + Date.now().toString(36)).toString('hex').substring(0, 24)}`,
      status: 'active',
    });
  }

  const token = createTokens({ userId: user._id.toString(), email: user.email, role: 'user', balance: user.balance }).jwtToken;

  sendSuccess(res, { message: 'Account created successfully.', token, email: user.email, requiresVerification: false }, 201);
});

export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  if (!email || !otp) throw new ApiError(400, 'Email and OTP are required');

  const otpRecord = await OTP.findOne({ email: email.toLowerCase(), otp });
  if (!otpRecord) throw new ApiError(401, 'Invalid OTP');
  if (otpRecord.expiresAt < new Date()) {
    await OTP.deleteOne({ _id: otpRecord._id });
    throw new ApiError(401, 'OTP has expired');
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw new ApiError(404, 'User not found');

  await OTP.deleteOne({ _id: otpRecord._id });

  const token = createTokens({ userId: user._id.toString(), email: user.email, role: user.role || 'user', balance: user.balance }).jwtToken;

  sendSuccess(res, {
    message: 'Login successful',
    token,
    user: { id: user._id, email: user.email, name: user.name, balance: user.balance, role: user.role || 'user' },
  });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, { message: 'Logged out successfully' });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  sendSuccess(res, {
    user: { id: user._id, email: user.email, name: user.name, balance: user.balance, role: user.role, twoFactorEnabled: user.twoFactorEnabled, status: user.status },
  });
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const { name, email } = req.body;
  const user = (req as any).user;
  if (name) user.name = name;
  if (email) user.email = email.toLowerCase();
  await user.save();
  sendSuccess(res, { user: { id: user._id, email: user.email, name: user.name, balance: user.balance, role: user.role } });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, 'Email is required');

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return sendSuccess(res, { message: 'If an account exists with this email, a password reset link has been sent' });

  const rawToken = PasswordReset.generateToken();
  await PasswordReset.create({
    userId: user._id,
    email: user.email,
    token: rawToken,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });

  await sendPasswordResetEmail({ email: user.email, resetToken: rawToken, name: user.name });

  sendSuccess(res, { message: 'If an account exists with this email, a password reset link has been sent' });
});

export const verifyResetToken = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.query;

  if (!token) throw new ApiError(400, 'Token is required');

  const record = await PasswordReset.findOne({ token, used: false });
  if (!record) throw new ApiError(400, 'Invalid or expired reset link');

  if (record.expiresAt < new Date()) {
    await PasswordReset.deleteOne({ _id: record._id });
    throw new ApiError(400, 'Reset link has expired');
  }

  const user = await User.findById(record.userId);
  if (!user) throw new ApiError(404, 'User not found');

  sendSuccess(res, { email: user.email, message: 'Token is valid' });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, password } = req.body;
  if (!token || !password) throw new ApiError(400, 'Token and new password are required');
  if (password.length < 8) throw new ApiError(400, 'Password must be at least 8 characters');
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password))
    throw new ApiError(400, 'Password must contain at least one uppercase letter, one lowercase letter, and one number');

  const record = await PasswordReset.findOne({ token, used: false });
  if (!record) throw new ApiError(400, 'Invalid or expired reset link');

  if (record.expiresAt < new Date()) {
    await PasswordReset.deleteOne({ _id: record._id });
    throw new ApiError(400, 'Reset link has expired');
  }

  const user = await User.findById(record.userId).select('+password');
  if (!user) throw new ApiError(404, 'User not found');

  user.password = password;
  await user.save();

  record.used = true;
  await record.save();

  sendSuccess(res, { message: 'Password reset successfully' });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw new ApiError(400, 'Current password and new password are required');
  if (newPassword.length < 8) throw new ApiError(400, 'New password must be at least 8 characters');

  const user = (req as any).user;
  const userWithPassword = await User.findById(user._id).select('+password');
  if (!userWithPassword) throw new ApiError(404, 'User not found');

  const isValid = await userWithPassword.comparePassword(currentPassword);
  if (!isValid) throw new ApiError(401, 'Current password is incorrect');

  userWithPassword.password = newPassword;
  await userWithPassword.save();

  sendSuccess(res, { message: 'Password changed successfully' });
});
