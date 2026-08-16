import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { socketAuthMiddleware, SocketData } from './socketAuth';
import { workspaceMemberRepository } from '../repositories/workspaceMember.repository';
import mongoose from 'mongoose';

let io: Server | null = null;

export function workspaceRoom(workspaceId: string): string {
  return `workspace:${workspaceId}`;
}

/**
 * Initializes the Socket.IO server on top of the existing HTTP server.
 * Every socket must authenticate with a valid JWT (socketAuthMiddleware)
 * and can only join a workspace room after the server independently
 * verifies membership in the database - the client-supplied workspaceId
 * is never trusted on its own.
 */
export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: env.corsOrigins, credentials: true },
  });

  io.use(socketAuthMiddleware);

  io.on('connection', (socket: Socket) => {
    const { userId } = socket.data as SocketData;
    logger.info({ userId, socketId: socket.id }, 'Socket connected');

    // Every authenticated socket automatically joins its own private
    // notification room so notification.created events can be targeted
    // to a specific user regardless of which workspace rooms they've joined.
    socket.join(`user:${userId}`);

    socket.on('workspace:join', async (workspaceId: string, ack?: (res: { ok: boolean; error?: string }) => void) => {
      try {
        if (!mongoose.isValidObjectId(workspaceId)) {
          ack?.({ ok: false, error: 'Invalid workspace id' });
          return;
        }
        const membership = await workspaceMemberRepository.findMembership(workspaceId, userId);
        if (!membership) {
          ack?.({ ok: false, error: 'Not a member of this workspace' });
          return;
        }
        socket.join(workspaceRoom(workspaceId));
        ack?.({ ok: true });
      } catch (err) {
        logger.error({ err }, 'Error joining workspace room');
        ack?.({ ok: false, error: 'Internal error' });
      }
    });

    socket.on('workspace:leave', (workspaceId: string) => {
      socket.leave(workspaceRoom(workspaceId));
    });

    socket.on('disconnect', (reason) => {
      logger.info({ userId, socketId: socket.id, reason }, 'Socket disconnected');
    });

    socket.on('error', (err) => {
      logger.error({ err, userId, socketId: socket.id }, 'Socket error');
    });
  });

  return io;
}

export function getIO(): Server | null {
  return io;
}
