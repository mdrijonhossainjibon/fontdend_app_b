import { Request, Response } from 'express';
import os from 'os';
import { execSync } from 'child_process';
import asyncHandler from '@/utils/asyncHandler';
import { sendSuccess } from '@/utils/response';
import { connectDB } from '@/config';
import { User } from '@/models/User';
import { Activity } from '@/models/Activity';
import { Package } from '@/models/Package';
import { ApiKey } from '@/models/ApiKey';
import { Solution } from '@/models/Solution';
import { Deposit } from '@/models/Deposit';
import { Extension } from '@/models/Extension';

export const getDashboardStats = asyncHandler(async (req: any, res: Response) => {
  await connectDB();

  const [
    totalUsers, activeUsers, totalSolvers, onlineSessions,
    totalRevenue, todayRevenue, monthlyRevenue, activePackages,
    recentUsers, recentActivities, currentWeekSales,
    rawExtensions, rawRecentDeposits, totalDepositsCount, totalActivities, totalApiKeys, totalSolutions
  ] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    User.countDocuments({ role: 'user', status: 'active' }),
    User.countDocuments({ role: 'solver' }),
    User.countDocuments({ isOnline: true, lastActive: { $gte: new Date(Date.now() - 5 * 60 * 1000) } }),
    (async () => {
      const result = await Deposit.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$amountUSD' } } }]);
      return result[0]?.total || 0;
    })(),
    (async () => {
      const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
      const result = await Deposit.aggregate([{ $match: { status: 'completed', createdAt: { $gte: startOfDay } } }, { $group: { _id: null, total: { $sum: '$amountUSD' } } }]);
      return result[0]?.total || 0;
    })(),
    (async () => {
      const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
      const result = await Deposit.aggregate([{ $match: { status: 'completed', createdAt: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: '$amountUSD' } } }]);
      return result[0]?.total || 0;
    })(),
    Package.countDocuments({ status: 'active' }),
    User.find({ role: 'user' }).sort({ createdAt: -1 }).limit(5).select('name email createdAt'),
    Activity.find().sort({ createdAt: -1 }).limit(5),
    (async () => {
      const startOfWeek = new Date(); startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); startOfWeek.setHours(0, 0, 0, 0);
      const deposits = await Deposit.find({ status: 'completed', createdAt: { $gte: startOfWeek } }).lean();
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const weeklyData = days.map((name, index) => {
        const day = new Date(startOfWeek); day.setDate(day.getDate() + index);
        const dayStr = day.toISOString().split('T')[0];
        const dayDeposits = deposits.filter((d: any) => new Date(d.createdAt).toISOString().split('T')[0] === dayStr);
        return { name, sales: dayDeposits.reduce((sum: number, d: any) => sum + (d.amountUSD || 0), 0), orders: dayDeposits.length };
      });
      return weeklyData;
    })(),
    Extension.find().sort({ createdAt: -1 }).limit(10).lean(),
    Deposit.find({ status: 'completed' }).sort({ createdAt: -1 }).limit(10).populate('userId', 'name email').lean(),
    Deposit.countDocuments(),
    Activity.countDocuments(),
    ApiKey.countDocuments(),
    Solution.countDocuments(),
  ]);

  const extensions = (rawExtensions || []).map((ext: any) => ({
    ...ext,
    downloadUrl: `${req.protocol}://${req.get('host')}/api/d/${ext.shortId}`
  }));

  // --- System Metrics ---
  const cpus = os.cpus();
  const cpuUsage = cpus.reduce((acc, cpu) => {
    const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
    const idle = cpu.times.idle;
    return acc + ((total - idle) / total) * 100;
  }, 0) / cpus.length;

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsagePct = (usedMem / totalMem) * 100;

  let diskUsagePct = 0;
  try {
    if (process.platform === 'win32') {
      const stdout = execSync(
        `powershell -Command "Get-PSDrive C | Select-Object Used,Free | ConvertTo-Csv -NoTypeInformation"`,
        { timeout: 5000 }
      ).toString();
      const lines = stdout.trim().split('\n');
      if (lines.length > 1) {
        const [usedStr, freeStr] = lines[1].split(',').map(s => s.replace(/"/g, ''));
        const usedDisk = parseInt(usedStr, 10);
        const freeDisk = parseInt(freeStr, 10);
        const totalDisk = usedDisk + freeDisk;
        if (totalDisk > 0) diskUsagePct = (usedDisk / totalDisk) * 100;
      }
    } else {
      const stdout = execSync("df -B1 / | tail -1 | awk '{print $2,$3}'", { timeout: 3000 }).toString();
      const [totalDisk, usedDisk] = stdout.trim().split(/\s+/).map(Number);
      if (totalDisk > 0) diskUsagePct = (usedDisk / totalDisk) * 100;
    }
  } catch { /* keep 0 */ }

  const cpuStatus = cpuUsage > 90 ? 'critical' : cpuUsage > 70 ? 'warning' : 'healthy';
  const memStatus = memUsagePct > 90 ? 'critical' : memUsagePct > 70 ? 'warning' : 'healthy';
  const diskStatus = diskUsagePct > 90 ? 'critical' : diskUsagePct > 70 ? 'warning' : 'healthy';

  const recentDeposits = (rawRecentDeposits || []).map((d: any) => ({
    _id: d._id,
    user: d.userId?.name || 'Unknown',
    email: d.userId?.email || '',
    amount: d.amount,
    amountUSD: d.amountUSD,
    cryptoName: d.cryptoName,
    status: d.status,
    createdAt: d.createdAt,
  }));

  sendSuccess(res, {
    users: { total: totalUsers, active: activeUsers, solvers: totalSolvers, online: onlineSessions },
    revenue: { total: totalRevenue, today: todayRevenue, monthly: monthlyRevenue },
    packages: { active: activePackages },
    system: { activities: totalActivities, apiKeys: totalApiKeys, deposits: totalDepositsCount, solutions: totalSolutions },
    recentUsers, recentActivities, weeklySales: currentWeekSales,
    extensions,
    recentDeposits,
    systemMetrics: {
      cpu: { status: cpuStatus, usage: Math.round(cpuUsage), cores: cpus.length, temp: 0 },
      memory: { status: memStatus, usage: Math.round(memUsagePct), used: +(usedMem / (1024 * 1024 * 1024)).toFixed(1), total: +(totalMem / (1024 * 1024 * 1024)).toFixed(1) },
      storage: { status: diskStatus, usage: Math.round(diskUsagePct) },
    },
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

  const deposits = await Deposit.find({ status: 'completed', createdAt: { $gte: dateFilter } }).sort({ createdAt: -1 }).lean();
  const revenueByDay: Record<string, number> = {};
  const revenueByMonth: Record<string, number> = {};

  deposits.forEach((d: any) => {
    const day = new Date(d.createdAt).toISOString().split('T')[0];
    const month = new Date(d.createdAt).toISOString().slice(0, 7);
    revenueByDay[day] = (revenueByDay[day] || 0) + (d.amountUSD || 0);
    revenueByMonth[month] = (revenueByMonth[month] || 0) + (d.amountUSD || 0);
  });

  sendSuccess(res, {
    period, totalRevenue: deposits.reduce((sum: number, d: any) => sum + (d.amountUSD || 0), 0),
    totalDeposits: deposits.length, dailyData: revenueByDay, monthlyData: revenueByMonth,
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
