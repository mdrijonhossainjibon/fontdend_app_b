import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { sendSuccess } from '@/utils/response';
import { connectDB } from '@/config';
import { Role } from '@/models/Role';
import { User } from '@/models/User';

const ALL_PERMISSIONS = [
  { key: 'users.manage', label: 'Manage Users', category: 'Users' },
  { key: 'users.view', label: 'View Users', category: 'Users' },
  { key: 'packages.manage', label: 'Manage Packages', category: 'Packages' },
  { key: 'packages.view', label: 'View Packages', category: 'Packages' },
  { key: 'wallet.manage', label: 'Manage Wallet', category: 'Wallet' },
  { key: 'wallet.view', label: 'View Wallet', category: 'Wallet' },
  { key: 'analytics.view', label: 'View Analytics', category: 'Analytics' },
  { key: 'settings.manage', label: 'Manage Settings', category: 'Settings' },
  { key: 'extensions.manage', label: 'Manage Extensions', category: 'Extensions' },
  { key: 'ai.manage', label: 'Manage AI Training', category: 'AI Training' },
  { key: 'database.manage', label: 'Manage Database', category: 'Database' },
  { key: 'email.manage', label: 'Manage Email', category: 'Email' },
  { key: 'crypto.manage', label: 'Manage Crypto', category: 'Crypto' },
  { key: 'deposits.manage', label: 'Manage Deposits', category: 'Deposits' },
  { key: 'history.view', label: 'View History', category: 'History' },
];

const ALL_KEYS = ALL_PERMISSIONS.map(p => p.key);

const DEFAULT_ROLES = [
  { name: 'Super Admin', slug: 'super-admin', description: 'Full access to all features', permissions: ALL_KEYS, status: 'active' },
  { name: 'Admin', slug: 'admin', description: 'Administrative access with limited settings', permissions: ALL_KEYS.filter(k => k !== 'settings.manage' && k !== 'database.manage'), status: 'active' },
  { name: 'User', slug: 'user', description: 'Basic user access — view only', permissions: ['users.view', 'packages.view', 'wallet.view', 'analytics.view', 'history.view'], status: 'active' },
];

async function seedDefaultRoles() {
  const count = await Role.countDocuments();
  if (count === 0) {
    await Role.insertMany(DEFAULT_ROLES);
    console.log('[seed] Default roles created: Super Admin, Admin, User');
  }
}

// ── Roles ──────────────────────────────────────────────────────────────────────

export const listRoles = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  await seedDefaultRoles();
  const roles = await Role.find().sort({ createdAt: -1 }).lean();
  sendSuccess(res, { roles });
});

export const createRole = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const role = await Role.create({
    name: req.body.name,
    slug: req.body.slug || req.body.name.toLowerCase().replace(/\s+/g, '-'),
    description: req.body.description || '',
    permissions: req.body.permissions || [],
    status: req.body.status || 'active',
  });
  sendSuccess(res, { role }, 201);
});

export const updateRole = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const { roleId, ...updateData } = req.body;
  if (!roleId) {
    res.status(400).json({ success: false, error: 'roleId is required' });
    return;
  }
  const updateFields: any = {};
  if (updateData.name !== undefined) updateFields.name = updateData.name;
  if (updateData.slug !== undefined) updateFields.slug = updateData.slug;
  if (updateData.description !== undefined) updateFields.description = updateData.description;
  if (updateData.permissions !== undefined) updateFields.permissions = updateData.permissions;
  if (updateData.status !== undefined) updateFields.status = updateData.status;
  await Role.findByIdAndUpdate(roleId, { $set: updateFields });
  sendSuccess(res, { message: 'Role updated' });
});

export const removeRole = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const { roleId } = req.query;
  if (!roleId) {
    res.status(400).json({ success: false, error: 'roleId is required' });
    return;
  }
  await Role.findByIdAndDelete(roleId);
  sendSuccess(res, { message: 'Role deleted' });
});

// ── Users ──────────────────────────────────────────────────────────────────────

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = req.query.search as string;

  const query: Record<string, unknown> = {};
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const roles = await Role.find({ status: 'active' }).lean();
  const roleMap = new Map(roles.map(r => [r.slug, r._id]));

  const [users, total] = await Promise.all([
    User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('name email role status createdAt')
      .lean(),
    User.countDocuments(query),
  ]);

  const mapped = users.map(u => ({
    id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    createdAt: u.createdAt,
  }));

  sendSuccess(res, {
    users: mapped,
    roles: roles.map(r => ({ id: r._id, name: r.name, slug: r.slug, permissions: r.permissions })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

export const updateUserRole = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const { userId, role } = req.body;
  if (!userId || !role) {
    res.status(400).json({ success: false, error: 'userId and role are required' });
    return;
  }
  await User.findByIdAndUpdate(userId, { $set: { role } });
  sendSuccess(res, { message: 'User role updated' });
});

// ── Permission List ────────────────────────────────────────────────────────────

export const listPermissions = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, { permissions: ALL_PERMISSIONS });
});
