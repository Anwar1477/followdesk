# FlowDesk Backend - Deployment Guide

This backend is a standard Node.js/Express process with a Socket.IO server attached to the same HTTP listener, so it deploys to any platform that runs a long-lived Node.js process (it is **not** designed as a serverless function, because Socket.IO needs a persistent connection). No specific hosting provider is assumed or pre-configured here - pick whichever fits your infrastructure (a VM, a container platform, a PaaS like Render/Railway/Fly.io, etc.).

## 1. Environment setup

Set every variable documented in docs/SETUP.md on your hosting platform's environment/secrets manager - never commit a production `.env` file. At minimum for production:

```
NODE_ENV=production
PORT=5000
CORS_ORIGINS=https://your-frontend-domain.com
MONGODB_URI=mongodb+srv://...
JWT_ACCESS_SECRET=<64+ char random string>
JWT_REFRESH_SECRET=<different 64+ char random string>
STORAGE_DRIVER=local   # or cloudinary, see below
```

## 2. MongoDB Atlas

For production, use MongoDB Atlas (or another managed MongoDB) rather than a self-hosted instance on the same box as the API:

1. Create a dedicated production cluster and database user (different credentials from any dev/staging environment).
2. Under Network Access, allow only your backend's outbound IP(s) - avoid `0.0.0.0/0` in production.
3. Enable Atlas backups.
4. Put the resulting `mongodb+srv://` URI in `MONGODB_URI`.

## 3. Backend deployment

```bash
npm ci
npm run build
npm run start
```

- `npm ci` installs exact versions from `package-lock.json` (reproducible builds).
- `npm run build` compiles `src/` → `dist/` via `tsconfig.build.json`.
- `npm run start` runs `node dist/server.js`.

Configure your platform's process manager/orchestrator to run `npm run start` as the entry command, with automatic restart on crash. `server.ts` already handles `SIGTERM`/`SIGINT` for graceful shutdown (stops accepting new connections, closes the HTTP server, disconnects MongoDB) - make sure your platform sends `SIGTERM` (not `SIGKILL`) on deploy/scale-down and gives it a few seconds before force-killing.

## 4. CORS configuration

Set `CORS_ORIGINS` to a comma-separated list of the exact frontend origin(s) allowed to call the API and open Socket.IO connections (e.g. `https://app.flowdesk.com`). Both the Express CORS middleware and the Socket.IO server read this same variable - update both automatically stay in sync since it's one source of truth in `config/env.ts`.

## 5. Socket.IO deployment considerations

- Socket.IO runs on the same HTTP server/port as the REST API - no separate process or port to expose.
- If you run **multiple instances** of the backend behind a load balancer, you need either sticky sessions (session affinity, so a given client's socket always reaches the same instance) or a shared adapter (e.g. `@socket.io/redis-adapter`) so `emitToWorkspace`/`emitToUserRoom` reach clients connected to a different instance. This backend ships single-instance by default; adding a Redis adapter is a documented future improvement (see README.md "Future improvements") rather than something silently assumed to work at scale.
- Ensure your load balancer/proxy supports WebSocket upgrade (most modern ones do; verify `Upgrade`/`Connection` headers are forwarded).

## 6. File storage configuration

- `STORAGE_DRIVER=local` (default): files are written to `backend/uploads/` on the server's local disk and served via `/uploads/...`. **This does not persist across redeploys/restarts on most PaaS platforms with ephemeral filesystems** - only use it in production if your platform provides a persistent volume mounted at `backend/uploads`.
- `STORAGE_DRIVER=cloudinary`: files are uploaded to Cloudinary and served from Cloudinary's CDN URL; nothing is written to local disk. Requires `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. **Recommended for production** unless you have a persistent volume set up.

## 7. Production environment variables checklist

- [ ] `NODE_ENV=production`
- [ ] `MONGODB_URI` points at a production database with a dedicated user
- [ ] `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` are long, random, and different from each other and from any dev/staging secret
- [ ] `CORS_ORIGINS` lists only real frontend origin(s), no `*`
- [ ] `STORAGE_DRIVER` and its credentials are set appropriately for your hosting environment
- [ ] Rate-limit variables are tuned for expected traffic

## 8. Build command / Start command (for PaaS config screens)

- Build: `npm ci && npm run build`
- Start: `npm run start`
- Health check path: `/api/health` (expects HTTP 200 with `{"success":true}` when healthy)

## 9. Logs

Pino writes structured JSON logs to stdout in production (pretty-printing is dev-only), which is what most log aggregators (Datadog, CloudWatch, Better Stack, etc.) expect out of the box. Secrets (passwords, tokens, the `Authorization`/`Cookie` headers) are redacted before logging - see `config/logger.ts`.

## 10. Common deployment issues

See docs/TROUBLESHOOTING.md for MongoDB connection failures, CORS errors, port conflicts, missing env vars, Socket.IO connection failures, and file upload issues encountered after deploying.
