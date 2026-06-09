import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { sendSuccess } from '@/utils/response';
import { connectDB } from '@/config';
import { HealthCheck } from '@/models/HealthCheck';
import { BotEndpoint } from '@/models/BotEndpoint';

export const list = asyncHandler(async (req: Request, res: Response) => {
    await connectDB();
    const statuses = await HealthCheck.find().sort({ lastChecked: -1 }).lean();
    sendSuccess(res, { healthStatuses: statuses });
});

export const run = asyncHandler(async (req: Request, res: Response) => {
    await connectDB();
    const { endpointId } = req.body;

    let bots;
    if (endpointId) {
        const bot = await BotEndpoint.findById(endpointId);
        if (!bot) throw new ApiError(404, 'Bot endpoint not found');
        bots = [bot];
    } else {
        bots = await BotEndpoint.find({ isActive: true }).lean();
    }

    const updatedStatuses: any[] = [];

    for (const bot of bots) {
        const url = `${bot.protocol}://${bot.endpoint}:${bot.port}/health`;
        const startTime = Date.now();
        let status: 'healthy' | 'unhealthy' | 'unknown' = 'unknown';
        let responseTime = 0;
        let errorMessage: string | undefined;
        let healthData: any = null;

        try {
            const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
            responseTime = Date.now() - startTime;
            if (response.ok) {
                status = 'healthy';
                try { healthData = await response.json(); } catch { }
            } else {
                status = 'unhealthy';
                errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
        } catch (err: any) {
            responseTime = Date.now() - startTime;
            status = 'unhealthy';
            errorMessage = err.message || 'Connection failed';
        }

        // Calculate uptime based on last 10 checks
        const recentChecks = await HealthCheck.find({ botName: bot.botName })
            .sort({ lastChecked: -1 })
            .limit(10)
            .lean();
        const totalChecks = recentChecks.length + 1;
        const isUp = status === 'healthy';
        const healthyChecks = recentChecks.filter(c => c.status === 'up').length + (isUp ? 1 : 0);
        const uptime = Math.round((healthyChecks / totalChecks) * 100);

        const dbStatus: 'up' | 'down' | 'degraded' = status === 'healthy' ? 'up' : status === 'unhealthy' ? 'down' : 'degraded';

        const updated = await HealthCheck.findOneAndUpdate(
            { botName: bot.botName },
            {
                botName: bot.botName,
                endpoint: `${bot.protocol}://${bot.endpoint}:${bot.port}`,
                status: dbStatus,
                responseTime,
                lastChecked: new Date(),
                uptime,
                errorMessage,
                healthData,
            },
            { upsert: true, new: true }
        ).lean();

        updatedStatuses.push(updated);
    }

    sendSuccess(res, { healthStatuses: updatedStatuses });
});
