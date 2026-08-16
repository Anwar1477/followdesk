import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler';

export const healthCheck = asyncHandler(async (_req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState; // 1 = connected
  const dbStatus = dbState === 1 ? 'connected' : 'disconnected';

  res.status(dbState === 1 ? 200 : 503).json({
    success: dbState === 1,
    data: {
      status: dbState === 1 ? 'ok' : 'degraded',
      uptimeSeconds: Math.floor(process.uptime()),
      database: dbStatus,
      timestamp: new Date().toISOString(),
    },
  });
});
