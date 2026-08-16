import { Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';

export interface SocketData {
  userId: string;
  email: string;
}

/**
 * Authenticates the socket handshake using the same JWT access token used
 * for REST requests (sent via `auth.token` in the client's socket.io
 * connection options). Rejects the connection outright on failure - there
 * is no anonymous socket access.
 */
export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void): void {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) {
      next(new Error('Authentication required'));
      return;
    }
    const payload = verifyAccessToken(token);
    (socket.data as SocketData).userId = payload.sub;
    (socket.data as SocketData).email = payload.email;
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
}
