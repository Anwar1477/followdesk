# FlowDesk Backend

Production-ready REST + realtime API for FlowDesk - a workspace/project/task management platform with a built-in **Decision Memory** (an auditable log of team decisions, with history preservation via supersession).

## Quick Start

```bash
cd followdesk/backend
npm install
cp .env.example .env        # then set MONGODB_URI, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
npm run dev                 # http://localhost:5000, GET /api/health to verify
npm run seed                # optional: populate demo data (dev only)
```

---

## 1. Overview

FlowDesk's backend is a strict-TypeScript, layered Express API backed by MongoDB, with Socket.IO for realtime updates. It implements authentication, per-workspace role-based access control, project/task management with dependencies, meetings with action-item→task conversion, the Decision Memory feature, a knowledge base with search, notifications, an activity feed, deterministic project health scoring, and analytics.

## 2. Features

- **Authentication**: register/login/logout, JWT access + refresh tokens, password change, forgot/reset password.
- **Workspaces & RBAC**: create/list/update/delete workspaces, invite/list/update/remove members, three roles (ADMIN/MANAGER/MEMBER) governed by a centralized permission matrix.
- **Projects**: full CRUD, status/priority, ownership, membership.
- **Tasks**: full CRUD, assignment, status/priority, labels, due dates, dependencies (with cycle/cross-project/cross-workspace prevention), comments with @mention notifications, attachments.
- **Meetings**: CRUD, participants, cancellation.
- **Meeting notes & action items**: notes with embedded action items; action items convert into real Tasks.
- **Decision Memory**: create/update/archive/search decisions, tag/link to projects/meetings/tasks, supersede with full history preservation.
- **Knowledge base (Documents)**: documents + folders, visibility, tags, project linking.
- **Global search**: MongoDB text-index search across projects/tasks/meetings/decisions/documents/members.
- **Project health**: deterministic (non-AI) HEALTHY/NEEDS_ATTENTION/AT_RISK scoring with explainable reasons.
- **Analytics**: workspace and project-level metrics via MongoDB aggregation.
- **Activity feed** and **notifications** (in-app + realtime).
- **Realtime**: Socket.IO events for tasks, comments, notifications, activity, meetings, decisions - workspace-room-scoped with server-verified membership.
- **File uploads**: pluggable storage (local disk or Cloudinary) for task/meeting/document attachments.

## 3. Tech stack

Node.js, TypeScript (strict), Express, MongoDB, Mongoose, JWT (jsonwebtoken), bcryptjs, Zod, Socket.IO, Helmet, cors, express-rate-limit, Pino, Multer, Cloudinary SDK (optional), Jest + Supertest + mongodb-memory-server. Full rationale per technology: **docs/TECHNOLOGIES.md**.

## 4. Architecture

Clean, layered, one-directional request flow:

```
Route → Middleware (auth/authz/validate) → Controller → Service → Repository → MongoDB
```

Controllers hold no business logic; services own business rules, side effects (Activity/Notification/Socket.IO), and orchestration; repositories are the only layer that queries Mongoose models directly. Full details, diagrams, and the two workspace-authorization patterns used: **docs/ARCHITECTURE.md**.

## 5. Folder structure

```
backend/
├── src/{config,constants,controllers,services,repositories,models,routes,middlewares,validators,utils,types,sockets}
├── tests/          # Jest + Supertest integration tests (real in-memory MongoDB)
├── scripts/seed.ts # development-only seed script
├── uploads/         # local file storage (STORAGE_DRIVER=local)
└── docs/            # this documentation set
```

## 6. Requirements

Node.js ≥ 18.18, npm ≥ 9, MongoDB ≥ 6.0 (local or Atlas), Git. Cloudinary account only if using `STORAGE_DRIVER=cloudinary`. Full details: **docs/SETUP.md**.

## 7. Installation

```bash
cd followdesk/backend
npm install
```

## 8. Environment variables

```bash
cp .env.example .env
```

See **docs/SETUP.md** for a full table of every variable and what it does.

## 9. MongoDB setup

Local (`mongodb://127.0.0.1:27017/flowdesk`) or MongoDB Atlas (`mongodb+srv://...`) - step-by-step for both in **docs/SETUP.md**. Mongoose creates collections/indexes automatically; no manual schema setup needed.

## 10. Development

```bash
npm run dev
```

## 11. Production build

```bash
npm run build
```

## 12. Production start

```bash
npm run start
```

## 13. Testing

```bash
npm test          # full suite once
npm run test:watch
```

29 tests across 12 suites, run against a real (ephemeral, in-memory) MongoDB instance - no mocked database layer. Covers: registration/login/token validation, workspace isolation (cross-workspace access denial), role-based authorization (member vs admin/manager), project CRUD + duplicate-key handling, task CRUD + dependency validation (self/cross-project/cycle prevention), Decision Memory create/supersede + history preservation, deterministic project health scoring, global search + workspace-scoping, task-assignment notifications, meetings + meeting notes + action-item-to-task conversion, the knowledge base (documents/folders), file attachment upload/validation/delete, and real Socket.IO connections (auth rejection, workspace-room membership enforcement, and a live `task.created` event round-trip).

**Known test-coverage limitations**: the activity feed endpoint (`GET /workspaces/:workspaceId/activities`) and the workspace/member management endpoints beyond what workspaceIsolation.test.ts exercises (e.g. listing members, updating a member's role) are exercised indirectly (through the services other tests already call) but don't have dedicated assertions of their own; adding those is a natural next step (see "Future improvements" below).

## 14. Seed data

```bash
npm run seed
```

Dev-only; refuses to run with `NODE_ENV=production`. Seeded credentials are for local development only - see **docs/SETUP.md**.

## 15. API documentation

Every endpoint (method, URL, auth, required role, params, body, responses, examples): **docs/API.md**.

## 16. Socket.IO documentation

Connection/auth flow, room model, full event catalogue with payloads: **docs/SOCKET.IO.md**.

## 17. Database documentation

Every collection, field, index, relationship, and the workspace-isolation strategy, plus an ER diagram: **docs/DATABASE.md**.

## 18. Authentication documentation

Full registration/login/JWT/refresh/logout/reset flows and the complete permission matrix: **docs/AUTHENTICATION.md**.

## 19. Security

- Passwords hashed with bcrypt (12 rounds); never logged (Pino redaction covers `password`, `token`, `Authorization`/`Cookie` headers, and secret env var names).
- JWT access + refresh tokens; refresh token delivered as an httpOnly, `SameSite=Lax`, `Secure`-in-production cookie; refresh tokens are revocable via a `tokenVersion` counter (logout/password-change invalidate all sessions).
- Every workspace-scoped route independently re-verifies membership against the database - never trusts a client-supplied `workspaceId`/`userId`/`role` (see docs/AUTHENTICATION.md and docs/DATABASE.md "Data isolation strategy").
- Centralized permission matrix (`constants/permissions.ts`) is the single source of truth for role capabilities.
- Helmet security headers, CORS allow-list, general + auth-specific rate limiting.
- Zod validation on every external request; Mongoose schema validation as a second layer.
- File uploads validated by MIME type and size before being persisted.
- Centralized error handler never leaks stack traces, secrets, or raw driver errors in production.
- No secrets are committed - `.env` is git-ignored; only `.env.example` (placeholder values) is tracked.

## 20. Deployment

Environment checklist, MongoDB Atlas setup, CORS, Socket.IO scaling considerations, file-storage persistence caveats, build/start/health-check commands: **docs/DEPLOYMENT.md**.

## 21. Troubleshooting

Common problems (MongoDB connection, JWT errors, CORS, port conflicts, missing env vars, Socket.IO failures, upload failures, permission/workspace-access denials, build/test failures) with cause + solution: **docs/TROUBLESHOOTING.md**.

## 22. Future improvements

- Outbound email delivery (invitations, password reset links) - currently in-app/dev-only (see docs/AUTHENTICATION.md).
- Redis-backed Socket.IO adapter for true multi-instance horizontal scaling (see docs/DEPLOYMENT.md §5).
- MongoDB Atlas Search (or another dedicated search engine) in place of `$text` indexes, once relevance/scale requirements exceed MVP text search - `services/search.service.ts` is already structured so this only touches its internal per-entity functions.
- Convert `projectHealth.service.ts`'s in-memory task aggregation to a MongoDB aggregation pipeline for very large projects.
- Exact (non-approximate) pagination for the mixed-type (no `type` filter) global search mode.
- Per-workspace configurability of whether MEMBER role can create Decisions (the permission hook already exists in `constants/permissions.ts`).
- Dedicated HTTP-level test coverage for the activity feed and the remaining member-management endpoints (currently covered indirectly - see "Testing" above).
