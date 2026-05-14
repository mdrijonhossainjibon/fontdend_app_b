import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { sendSuccess } from '@/utils/response';
import { connectDB } from '@/config';
import { User } from '@/models/User';
import { Activity } from '@/models/Activity';
import { Package } from '@/models/Package';
import { ApiKey } from '@/models/ApiKey';
import { Solution } from '@/models/Solution';
import { Deposit } from '@/models/Deposit';

export const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();

  const [
    totalUsers, activeUsers, totalSolvers, onlineSessions,
    totalRevenue, todayRevenue, monthlyRevenue, activePackages,
    recentUsers, recentActivities, currentWeekSales,
  ] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    User.countDocuments({ role: 'user', isActive: true }),
    User.countDocuments({ role: 'solver' }),
    User.countDocuments({ isOnline: true, lastActive: { $gte: new Date(Date.now() - 5 * 60 * 1000) } }),
    (async () => {
      const result = await Package.aggregate([{ $group: { _id: null, total: { $sum: '$price' } } }]);
      return result[0]?.total || 0;
    })(),
    (async () => {
      const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
      const result = await Package.aggregate([{ $match: { createdAt: { $gte: startOfDay } } }, { $group: { _id: null, total: { $sum: '$price' } } }]);
      return result[0]?.total || 0;
    })(),
    (async () => {
      const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
      const result = await Package.aggregate([{ $match: { createdAt: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: '$price' } } }]);
      return result[0]?.total || 0;
    })(),
    Package.countDocuments({ status: 'active' }),
    User.find({ role: 'user' }).sort({ createdAt: -1 }).limit(5).select('name email createdAt'),
    Activity.find().sort({ createdAt: -1 }).limit(5),
    (async () => {
      const startOfWeek = new Date(); startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); startOfWeek.setHours(0, 0, 0, 0);
      const sales = await Package.find({ createdAt: { $gte: startOfWeek } }).lean();
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const weeklyData = days.map((name, index) => {
        const day = new Date(startOfWeek); day.setDate(day.getDate() + index);
        const dayStr = day.toISOString().split('T')[0];
        const daySales = sales.filter((s: any) => new Date(s.createdAt).toISOString().split('T')[0] === dayStr);
        return { name, sales: daySales.reduce((sum: number, s: any) => sum + (s.price || 0), 0), orders: daySales.length };
      });
      return weeklyData;
    })(),
  ]);

  const totalActivities = await Activity.countDocuments();
  const totalApiKeys = await ApiKey.countDocuments();
  const totalDeposits = await Deposit.countDocuments();

  sendSuccess(res, {
    users: { total: totalUsers, active: activeUsers, solvers: totalSolvers, online: onlineSessions },
    revenue: { total: totalRevenue, today: todayRevenue, monthly: monthlyRevenue },
    packages: { active: activePackages },
    system: { activities: totalActivities, apiKeys: totalApiKeys, deposits: totalDeposits, solutions: await Solution.countDocuments() },
    recentUsers, recentActivities, weeklySales: currentWeekSales,
  });
});

export const getRevenueStats = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const period = (req.query.period as string) || '7d';

  let dateFilter: Date;
  switch (period) {
    case '30d': dateFilter = new Date(Date.now() - 30 * 86400000); break;
    case '90d': dateFilter = new Date(Date.now() - 90 * 86400000); break;
    case '1y': dateFilter = new Date(Date.now() - 365 * 86400000); break;
    default: dateFilter = new Date(Date.now() - 7 * 86400000);
  }

  const packages = await Package.find({ createdAt: { $gte: dateFilter } }).sort({ createdAt: -1 }).lean();
  const revenueByDay: Record<string, number> = {};
  const revenueByMonth: Record<string, number> = {};

  packages.forEach((p: any) => {
    const day = new Date(p.createdAt).toISOString().split('T')[0];
    const month = new Date(p.createdAt).toISOString().slice(0, 7);
    revenueByDay[day] = (revenueByDay[day] || 0) + (p.price || 0);
    revenueByMonth[month] = (revenueByMonth[month] || 0) + (p.price || 0);
  });

  sendSuccess(res, {
    period, totalRevenue: packages.reduce((sum: number, p: any) => sum + (p.price || 0), 0),
    totalPackages: packages.length, dailyData: revenueByDay, monthlyData: revenueByMonth,
  });
});

export const getUserAnalytics = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();

  const totalUsers = await User.countDocuments({ role: 'user' });
  const [activeLastDay, activeLastWeek, activeLastMonth] = await Promise.all([
    User.countDocuments({ role: 'user', lastActive: { $gte: new Date(Date.now() - 86400000) } }),
    User.countDocuments({ role: 'user', lastActive: { $gte: new Date(Date.now() - 7 * 86400000) } }),
    User.countDocuments({ role: 'user', lastActive: { $gte: new Date(Date.now() - 30 * 86400000) } }),
  ]);

  const users = await User.find({ role: 'user' }).sort({ createdAt: -1 }).select('createdAt');
  const signupsByMonth: Record<string, number> = {};
  users.forEach((u: any) => {
    const month = new Date(u.createdAt).toISOString().slice(0, 7);
    signupsByMonth[month] = (signupsByMonth[month] || 0) + 1;
  });

  sendSuccess(res, {
    total: totalUsers, active: { day: activeLastDay, week: activeLastWeek, month: activeLastMonth },
    totalSignups: users.length,
    retention: activeLastMonth > 0 ? Math.round((activeLastDay / activeLastMonth) * 100) : 0,
    signupsByMonth,
  });
});
