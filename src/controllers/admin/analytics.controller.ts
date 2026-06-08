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
import { AnalyticsEvent } from '@/models/AnalyticsEvent';

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

// ── Resolve IPs to countries via ip-api.com (free, no key needed) ─────────────
async function resolveCountries(events: any[]): Promise<void> {
  const needsLookup = events.filter((e: any) => e.ip && !e.country);
  if (needsLookup.length === 0) return;

  // Deduplicate by IP
  const uniqueIPs = [...new Set(needsLookup.map((e: any) => e.ip))];
  const ipToCountry: Record<string, string> = {};

  // Batch in chunks of 100 (ip-api limit)
  for (let i = 0; i < uniqueIPs.length; i += 100) {
    const batch = uniqueIPs.slice(i, i + 100);
    try {
      // Single IP lookup is free, batch requires pro — use single per IP
      const results = await Promise.allSettled(
        batch.map(ip =>
          fetch(`http://ip-api.com/json/${ip}?fields=country`).then(r => r.json())
        )
      );
      results.forEach((res, idx) => {
        if (res.status === 'fulfilled' && res.value && res.value.country) {
          ipToCountry[batch[idx]] = res.value.country;
        }
      });
    } catch { /* skip failures */ }
  }

  // Update events with resolved countries + persist to DB
  const bulkOps: any[] = [];
  events.forEach((e: any) => {
    if (e.ip && !e.country && ipToCountry[e.ip]) {
      e.country = ipToCountry[e.ip];
      bulkOps.push({
        updateOne: { filter: { _id: e._id }, update: { $set: { country: ipToCountry[e.ip] } } },
      });
    }
  });

  if (bulkOps.length > 0) {
    await AnalyticsEvent.bulkWrite(bulkOps).catch(() => {});
  }
}

// ── Consolidated Analytics Dashboard ─────────────────────────────────────────
export const getAnalytics = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();

  const days = parseInt(req.query.days as string) || 30;
  const since = new Date(Date.now() - days * 86400000);

  const [totalCaptchas, apiKeys, completedDeposits, events] = await Promise.all([
    AnalyticsEvent.countDocuments({ eventType: 'captcha_solve' }),
    ApiKey.countDocuments(),
    Deposit.countDocuments({ status: 'completed' }),
    AnalyticsEvent.find({ createdAt: { $gte: since } }).lean(),
  ]);

  // Resolve IPs to countries (free ip-api.com)
  await resolveCountries(events);

  // ── Daily chart data ──
  const dayMap: Record<string, { date: string; requests: number; users: number; successCount: number; totalCount: number }> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().split('T')[0];
    dayMap[key] = { date: key, requests: 0, users: 0, successCount: 0, totalCount: 0 };
  }

  let totalApiCalls = 0;
  let totalResponseTime = 0;
  let responseTimeCount = 0;
  let periodCaptchaCount = 0;

  const countryMap: Record<string, number> = {};
  const typeMap: Record<string, number> = {};

  events.forEach((e: any) => {
    const key = new Date(e.createdAt).toISOString().split('T')[0];
    if (!dayMap[key]) return;

    dayMap[key].requests++;

    if (e.eventType === 'captcha_solve') {
      dayMap[key].totalCount++;
      periodCaptchaCount++;
      if (e.status === 'success') dayMap[key].successCount++;
      if (e.category) typeMap[e.category] = (typeMap[e.category] || 0) + 1;
      if (e.responseTime) { totalResponseTime += e.responseTime; responseTimeCount++; }
    }
    if (e.eventType === 'api_request') {
      totalApiCalls++;
    }
    // Country — from resolved or already stored
    const country = e.country || 'Unknown';
    countryMap[country] = (countryMap[country] || 0) + 1;
  });

  // User signups from User model
  const recentUsers = await User.find({ role: 'user', createdAt: { $gte: since } }).select('createdAt').lean();
  const signupDayMap: Record<string, number> = {};
  recentUsers.forEach((u: any) => {
    const key = new Date(u.createdAt).toISOString().split('T')[0];
    signupDayMap[key] = (signupDayMap[key] || 0) + 1;
  });
  Object.entries(signupDayMap).forEach(([key, count]) => {
    if (dayMap[key]) dayMap[key].users = count;
  });

  const chartData = Object.values(dayMap)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({
      ...d,
      successRate: d.totalCount > 0 ? ((d.successCount / d.totalCount) * 100).toFixed(1) + '%' : '100%',
    }));

  // ── Metrics ──
  const avgResponseTimeMs = responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0;
  const totalEvents = events.length;
  const totalEventSuccess = events.filter((e: any) => e.status === 'success').length;

  const metrics = {
    totalCaptchas: { value: totalCaptchas.toLocaleString(), change: `+${periodCaptchaCount}` },
    avgResponseTime: {
      value: avgResponseTimeMs > 1000 ? `${(avgResponseTimeMs / 1000).toFixed(1)}s` : `${Math.round(avgResponseTimeMs)}ms`,
      change: avgResponseTimeMs > 0 ? `${Math.round(avgResponseTimeMs)}ms` : '0ms',
    },
    successRate: {
      value: totalEvents > 0 ? `${((totalEventSuccess / totalEvents) * 100).toFixed(1)}%` : '100%',
      change: `+${totalEvents > 0 ? ((totalEventSuccess / totalEvents) * 100).toFixed(0) : 100}%`,
    },
    apiCalls: { value: totalApiCalls.toLocaleString(), change: `+${totalApiCalls}` },
    totalRevenue: { value: `$${(completedDeposits || 0).toLocaleString()}`, change: `+${completedDeposits}` },
    activeApiKeys: { value: apiKeys.toLocaleString(), change: `+${apiKeys > 0 ? Math.min(apiKeys, 10) : 0}` },
  };

  // ── Top countries ──
  const topCountries = Object.entries(countryMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([country, requests]) => ({ country, requests }));

  // ── Captcha types ──
  const captchaTypes = Object.entries(typeMap)
    .sort(([, a], [, b]) => b - a)
    .map(([type, count], i) => ({
      type: type.toUpperCase(),
      count,
      color: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'][i % 5],
    }));

  sendSuccess(res, { chartData, metrics, topCountries, captchaTypes });
});
