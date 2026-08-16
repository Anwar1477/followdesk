# FlowDesk Backend - Setup & Run Guide

This guide is intended to be sufficient on its own for a new developer to clone the project and run the backend without asking anyone a question.

## Requirements

- **Node.js** ≥ 18.18.0 (LTS 20.x recommended)
- **npm** ≥ 9 (ships with Node 18+)
- **MongoDB** ≥ 6.0 - either a local instance or a free MongoDB Atlas cluster
- **Git**
- **Cloudinary account** - only required if you set `STORAGE_DRIVER=cloudinary`; not needed for the default `local` storage driver

## Installation

```bash
cd followdesk/backend
npm install
```

## Environment setup

```bash
cp .env.example .env
```

Then edit `.env`. Every variable is documented in `.env.example`; the important ones:

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | no (default `development`) | `development` \| `test` \| `production` |
| `PORT` | no (default `5000`) | HTTP port |
| `API_PREFIX` | no (default `/api`) | Mount path for all REST routes |
| `CORS_ORIGINS` | yes in production | Comma-separated list of allowed frontend origins |
| `MONGODB_URI` | **yes** | MongoDB connection string (see below) |
| `JWT_ACCESS_SECRET` | **yes** | Long random string signing access tokens |
| `JWT_REFRESH_SECRET` | **yes** | Long random string signing refresh tokens (must differ from the access secret) |
| `JWT_ACCESS_EXPIRES_IN` | no (default `15m`) | Access token TTL |
| `JWT_REFRESH_EXPIRES_IN` | no (default `30d`) | Refresh token TTL |
| `PASSWORD_RESET_TOKEN_TTL_MINUTES` | no (default `30`) | Password reset token validity |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | no | General API rate limit |
| `AUTH_RATE_LIMIT_WINDOW_MS` / `AUTH_RATE_LIMIT_MAX` | no | Stricter limit for `/auth/*` |
| `LOG_LEVEL` | no (default `info`) | Pino log level |
| `STORAGE_DRIVER` | no (default `local`) | `local` \| `cloudinary` |
| `MAX_UPLOAD_SIZE_MB` | no (default `10`) | Max attachment size |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | only if `STORAGE_DRIVER=cloudinary` | Cloudinary credentials |
| `CLIENT_URL` | no | Used when building links back to the frontend (e.g. future email templates) |

Generate strong secrets, e.g.:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## MongoDB setup

**Option A - Local MongoDB**

Install MongoDB Community Server, then start it (varies by OS - `mongod` or your OS service manager), and set:

```
MONGODB_URI=mongodb://127.0.0.1:27017/flowdesk
```

**Option B - MongoDB Atlas (free tier works)**

1. Create a cluster at https://www.mongodb.com/cloud/atlas.
2. Under **Database Access**, create a user with a strong password.
3. Under **Network Access**, allow your IP (or `0.0.0.0/0` for quick local testing only).
4. Click **Connect → Drivers**, copy the `mongodb+srv://...` connection string.
5. Paste it into `.env` as `MONGODB_URI`, replacing `<password>` and adding a database name, e.g.:

```
MONGODB_URI=mongodb+srv://flowdesk_user:REPLACE_ME@cluster0.xxxxx.mongodb.net/flowdesk?retryWrites=true&w=majority
```

No manual schema/collection creation is needed - Mongoose creates collections and indexes automatically on first use.

## Development

```bash
npm run dev
```

Starts the API with hot-reload (`tsx watch`) on `http://localhost:5000` (or your configured `PORT`), connects to MongoDB, and starts the Socket.IO server on the same port.

## Production build

```bash
npm run build
```

Type-checks and compiles `src/` to `dist/` (via `tsconfig.build.json`, which builds only `src/` - `tests/` and `scripts/` are excluded from the production bundle).

## Production start

```bash
npm run start
```

Runs `node dist/server.js`. Requires `npm run build` to have been run first, and requires all required environment variables to be set (the process throws on startup outside `NODE_ENV=test` if a required variable is missing).

## Testing

```bash
npm test
```

Runs the full Jest + Supertest suite against a real, ephemeral MongoDB instance spun up per test run by `mongodb-memory-server` (no separate MongoDB installation needed to run tests). See docs/PERFORMANCE.md / the project README for what's covered.

```bash
npm run test:watch
```

## Seed database

```bash
npm run seed
```

Populates the database pointed to by `MONGODB_URI` with a demo workspace, users, project, tasks, a meeting, a decision, a document, a notification, and an activity entry. **Development only** - the script refuses to run when `NODE_ENV=production`. Seeded credentials (never use in production):

| Role | Email | Password |
|---|---|---|
| Admin | `admin@flowdesk.dev` | `DevPassword123` |
| Manager | `manager@flowdesk.dev` | `DevPassword123` |
| Member | `member@flowdesk.dev` | `DevPassword123` |

## Lint

```bash
npm run lint
```

## Type-check only (no build output)

```bash
npm run typecheck
```

## Health check

```bash
GET /api/health
```

```json
{ "success": true, "data": { "status": "ok", "uptimeSeconds": 42, "database": "connected", "timestamp": "2026-01-01T00:00:00.000Z" } }
```

Returns HTTP 503 with `"status": "degraded"` and `"database": "disconnected"` if MongoDB is unreachable. This endpoint is excluded from request-level access logging to keep logs readable when used by uptime monitors/load balancers.
