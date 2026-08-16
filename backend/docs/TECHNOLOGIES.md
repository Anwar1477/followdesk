# FlowDesk Backend - Technology Reference

Every technology listed here is an actual dependency in `package.json` and is actively used somewhere in `src/`. Versions are the ones pinned/resolved at the time this backend was built - see `package.json` for exact semver ranges.

## Node.js

**Purpose:** JavaScript runtime.
**Why:** Ubiquitous, first-class TypeScript tooling, non-blocking I/O suits an API that does a lot of MongoDB round-trips and holds many concurrent Socket.IO connections.
**Where used:** Runs the entire backend (`dist/server.js` in production, `tsx` in development).
**Configuration:** `engines.node >= 18.18.0` in `package.json`.
**Commands:** `node dist/server.js` (production entry point, invoked by `npm start`).

## TypeScript (5.x)

**Purpose:** Static typing for the entire codebase.
**Why:** The spec requires strict TypeScript; catches whole classes of bugs (wrong field names, mismatched IDs, missing awaits) at compile time across a codebase with dozens of interdependent modules (models ↔ repositories ↔ services ↔ controllers).
**Where used:** Every file in `src/`, `tests/`, `scripts/`.
**Configuration:** `tsconfig.json` - `strict: true`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`.
**Commands:** `npm run typecheck` (no emit), `npm run build` (emits to `dist/`).

## Express 4

**Purpose:** HTTP server / routing framework.
**Why:** Explicitly requested; minimal, well-understood middleware model that maps cleanly onto the required request pipeline (route → middleware → validation → controller).
**Where used:** `src/app.ts` (app assembly), every file under `src/routes/`, `src/middlewares/`.
**Communicates with:** Receives HTTP requests from clients; controllers call into the service layer; the same `http.Server` instance is shared with Socket.IO (`server.ts`).
**Configuration:** `trust proxy` enabled (for correct client IPs behind a reverse proxy/load balancer), JSON/urlencoded body limits set to 2mb.

## MongoDB

**Purpose:** Primary application database.
**Why:** Explicitly requested; flexible document model fits FlowDesk's mix of structured records (tasks, projects) and semi-structured ones (decision memory fields, embedded action items); native text indexes cover the MVP search requirement without extra infrastructure.
**Where used:** Every collection in `src/models/`, queried exclusively through `src/repositories/`.
**Connection:** `MONGODB_URI` environment variable (local `mongodb://` or Atlas `mongodb+srv://`). See docs/SETUP.md.
**Commands:** `mongosh "$MONGODB_URI"` to connect manually; `npm run seed` to populate development data.

## Mongoose (8.x)

**Purpose:** ODM (Object Document Mapper) for MongoDB.
**Why:** Schema validation at the application layer, TypeScript-friendly model typing, built-in support for compound/text indexes and population, and a mature ecosystem.
**Where used:** `src/models/*.ts` (schema + interface definitions), `src/repositories/*.ts` (all queries).
**Communicates with:** Talks to MongoDB over the driver; every repository method is a thin wrapper around a Mongoose query.
**Configuration:** `mongoose.set('strictQuery', true)` in `src/config/db.ts`.

## jsonwebtoken

**Purpose:** Signs and verifies JWT access/refresh tokens.
**Why:** Industry-standard, stateless authentication that avoids a server-side session store for access tokens while still supporting revocation via the `tokenVersion` pattern for refresh tokens.
**Where used:** `src/utils/jwt.ts`, consumed by `middlewares/authenticate.ts` and `sockets/socketAuth.ts`.
**Configuration:** `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`.

## bcryptjs

**Purpose:** Password hashing.
**Why:** Pure-JS bcrypt implementation (no native build step, so it installs reliably on any platform including Windows), which the spec explicitly allows as an alternative to `bcrypt`.
**Where used:** `src/utils/password.ts` (`hashPassword`/`comparePassword`), called from `auth.service.ts`.
**Configuration:** 12 salt rounds.

## Zod

**Purpose:** Runtime request validation and TypeScript type inference.
**Why:** Explicitly requested; a single schema definition gives both a runtime validator and a static type, keeping validators and their TypeScript types from drifting apart.
**Where used:** Every file in `src/validators/`, applied via `middlewares/validate.ts` on every route that accepts a body/query/params.

## Socket.IO 4

**Purpose:** Realtime bidirectional events (task moves, comments, notifications, activity feed, meeting/decision updates).
**Why:** Explicitly requested; handles reconnection, room-based broadcast, and authentication middleware out of the box.
**Where used:** `src/sockets/*.ts`, wired into the same HTTP server in `server.ts`.
**Communicates with:** Authenticates via the same JWT as REST; the service layer (never controllers) calls `sockets/emitter.ts` to broadcast to `workspace:{id}` or `user:{id}` rooms.
**Configuration:** CORS origins shared with the REST API (`CORS_ORIGINS`).

## Helmet

**Purpose:** Sets security-related HTTP response headers (CSP baseline, `X-Content-Type-Options`, `X-Frame-Options`, HSTS, etc.).
**Why:** Explicitly requested; a single well-maintained middleware covers a broad set of OWASP-recommended headers.
**Where used:** `src/app.ts`, applied globally before routing.

## cors

**Purpose:** Cross-Origin Resource Sharing control.
**Why:** The frontend runs on a different origin/port than the API; `cors` restricts which origins may call the API and send credentials (cookies).
**Where used:** `src/app.ts` and the Socket.IO server, both configured from `CORS_ORIGINS`.

## express-rate-limit

**Purpose:** Request rate limiting.
**Why:** Explicitly requested; mitigates brute-force login/registration attempts and general API abuse.
**Where used:** `src/middlewares/rateLimiter.ts` - a general `apiRateLimiter` on all routes and a stricter `authRateLimiter` on auth endpoints.
**Configuration:** `RATE_LIMIT_WINDOW_MS`/`RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_WINDOW_MS`/`AUTH_RATE_LIMIT_MAX`.

## Pino / pino-http / pino-pretty

**Purpose:** Structured JSON logging.
**Why:** Explicitly requested (Pino or Winston); very low overhead, first-class structured (JSON) output suited to log aggregation, with automatic secret redaction.
**Where used:** `src/config/logger.ts` (base logger), `app.ts` (`pino-http` request logging, disabled in tests and for the `/health` route to keep output readable), every service/middleware that logs.
**Configuration:** `LOG_LEVEL`; redacts `password`, `token`, `Authorization`/`Cookie` headers, and secret env var names; pretty-printed only in development (`pino-pretty`), raw JSON in production.

## Multer

**Purpose:** Parses `multipart/form-data` file uploads.
**Why:** Explicitly requested; the standard Express file-upload middleware.
**Where used:** `src/middlewares/upload.ts` - memory storage (buffers files rather than writing directly to disk) so the same middleware works for both storage drivers below.
**Configuration:** `MAX_UPLOAD_SIZE_MB`, an allow-list of MIME types.

## Cloudinary SDK (optional storage backend)

**Purpose:** Cloud file storage/CDN.
**Why:** Explicitly requested as an S3-compatible-style option; used only when `STORAGE_DRIVER=cloudinary`.
**Where used:** `src/config/cloudinary.ts` (SDK config, only initialized when selected), `src/services/storage.service.ts` (`CloudinaryStorageDriver`).
**Configuration:** `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
**Note:** When `STORAGE_DRIVER=local` (the default), Cloudinary is never contacted - files are written to `backend/uploads/` and served via `express.static`. Business logic (`attachment.service.ts`) never imports Cloudinary directly - only `storage.service.ts` does, behind the `StorageDriver` interface.

## Jest + ts-jest + Supertest + mongodb-memory-server

**Purpose:** Automated testing.
**Why:** Explicitly requested (Jest); `ts-jest` runs TypeScript tests without a separate build step; `supertest` drives the Express app in-process over HTTP semantics; `mongodb-memory-server` spins up a real (not mocked) MongoDB instance per test run so tests exercise real queries, indexes, and validation - satisfying "no mock/static data" for the actual data layer.
**Where used:** `tests/*.test.ts`, `tests/setup.ts` (starts/stops the in-memory MongoDB and clears collections between tests), `jest.config.js`.
**Commands:** `npm test`, `npm run test:watch`.

## dotenv

**Purpose:** Loads `.env` into `process.env` in development.
**Why:** Standard, minimal way to keep secrets out of source control while keeping local setup simple.
**Where used:** `src/config/env.ts` (loaded first, before any other config module reads `process.env`).

## nanoid

**Purpose:** Short, URL-safe random ID generation.
**Why:** Used to guarantee uniqueness for workspace slugs and document slugs without a database round-trip loop in the common case.
**Where used:** `src/utils/slug.ts`.

## cookie-parser

**Purpose:** Parses the `Cookie` header so the refresh-token httpOnly cookie can be read.
**Where used:** `src/app.ts`, consumed by `controllers/auth.controller.ts` (`req.cookies.refreshToken`).

## ESLint + @typescript-eslint

**Purpose:** Static code quality/style checks.
**Where used:** Project-wide via `.eslintrc.json`.
**Commands:** `npm run lint`.

## How they work together (data flow)

```
Client (fetch/axios + socket.io-client)
  │ HTTPS (Express+Helmet+CORS+rate-limit) / WSS (Socket.IO, same JWT)
  ▼
Express routes → Zod validators → Controllers → Services
  │                                                  │
  │                                    ┌─────────────┼───────────────┐
  │                                    ▼             ▼               ▼
  │                              Mongoose         Multer +      Socket.IO
  │                              Repositories   Storage driver   emitter
  │                                    │        (local disk or       │
  │                                    ▼         Cloudinary)          │
  │                                MongoDB                            │
  │                                                                    │
  └────────────────────── Pino structured logs throughout ────────────┘
```
