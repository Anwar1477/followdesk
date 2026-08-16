# FlowDesk Backend - Architecture

## 1. High-level architecture

FlowDesk's backend is a layered, modular Node.js/Express/TypeScript API backed by MongoDB, with a Socket.IO layer for realtime events. It follows a strict one-directional request flow so business logic never leaks into controllers and data access never leaks into services.

```
                        ┌─────────────────────────────┐
                        │           Client            │
                        │  (frontend / mobile / API)  │
                        └──────────────┬───────────────┘
                                       │ HTTPS / WSS
                        ┌──────────────▼───────────────┐
                        │   Express App (app.ts)        │
                        │  helmet, cors, rate-limit,     │
                        │  json body parser, cookies      │
                        └──────────────┬───────────────┘
                                       │
                        ┌──────────────▼───────────────┐
                        │            Routes             │
                        │  (routes/*.routes.ts)          │
                        └──────────────┬───────────────┘
                                       │
                        ┌──────────────▼───────────────┐
                        │          Middlewares           │
                        │ authenticate → requireWorkspace │
                        │ Member/resolveWorkspaceFromEntity│
                        │ → authorize/requireRole → validate│
                        └──────────────┬───────────────┘
                                       │
                        ┌──────────────▼───────────────┐
                        │          Controllers            │
                        │   (thin - no business logic)     │
                        └──────────────┬───────────────┘
                                       │
                        ┌──────────────▼───────────────┐
                        │            Services              │
                        │ (business logic, orchestration,   │
                        │  activity/notification/socket emit)│
                        └──────────────┬───────────────┘
                                       │
                        ┌──────────────▼───────────────┐
                        │          Repositories             │
                        │  (Mongoose query encapsulation)    │
                        └──────────────┬───────────────┘
                                       │
                        ┌──────────────▼───────────────┐
                        │             MongoDB                 │
                        └───────────────────────────────────┘
```

Socket.IO runs alongside the HTTP server on the same port, sharing the Express `http.Server` instance (see `server.ts`).

## 2. Folder structure

```
backend/
├── src/
│   ├── config/        # env loading, DB connection, logger, Cloudinary config
│   ├── constants/      # enums, error codes, centralized permission matrix
│   ├── controllers/    # thin request/response glue - no business logic
│   ├── services/       # business logic, orchestrates repositories + side effects
│   ├── repositories/   # Mongoose query encapsulation per collection
│   ├── models/         # Mongoose schemas/models + TypeScript interfaces
│   ├── routes/         # Express routers, wire middleware -> validator -> controller
│   ├── middlewares/    # auth, authorization, validation, error handling, uploads
│   ├── validators/     # Zod schemas for every external request
│   ├── utils/          # ApiError, ApiResponse, jwt, password, pagination, etc.
│   ├── types/          # Express Request augmentation (req.user, req.workspaceMembership)
│   ├── sockets/         # Socket.IO server, auth middleware, room helpers, emitters
│   ├── app.ts           # Express app assembly (no listen())
│   └── server.ts        # Bootstraps DB + HTTP + Socket.IO + graceful shutdown
├── tests/               # Jest + Supertest + mongodb-memory-server integration tests
├── scripts/seed.ts      # Development-only seed script
├── uploads/             # Local file storage (STORAGE_DRIVER=local)
└── docs/                # This documentation set
```

## 3. Request lifecycle

Every request follows the same pipeline:

```
Request
 → Route (routes/*.routes.ts)
 → authenticate            (verifies JWT, sets req.user)
 → requireWorkspaceMember  OR  resolveWorkspaceFromParam
                            (verifies DB membership, sets req.workspaceMembership)
 → authorize / requireRole / allowPermissionOrOwner
                            (permission matrix check)
 → validate                (Zod schema, replaces req.body/query/params)
 → Controller               (asyncHandler-wrapped, calls exactly one service function)
 → Service                  (business rules, calls repositories, records Activity,
                             creates Notifications, emits Socket.IO events)
 → Repository / Model       (Mongoose query)
 → MongoDB
 ← ApiResponse (success/list) or thrown ApiError → errorHandler
```

Controllers never contain business logic - they extract request data, call a single service function, and shape the response with `sendSuccess`/`sendList` from `utils/ApiResponse.ts`.

## 4. Two patterns for workspace-scoped authorization

FlowDesk has two families of routes:

1. **Directly nested under `/workspaces/:workspaceId/...`** (members, project/task/meeting/decision/document *listing and creation*, analytics, activities). These use the `requireWorkspaceMember` middleware, which reads `:workspaceId` from the URL, looks up the caller's membership in MongoDB, and attaches `req.workspaceMembership`.

2. **Flat resource routes** (`/tasks/:taskId`, `/comments/:commentId`, `/meetings/:meetingId`, `/decisions/:decisionId`, `/documents/:documentId`, `/attachments/:attachmentId`, ...). These use `resolveWorkspaceFromParam`, which loads the entity by its own id, reads `workspaceId` directly off the *stored document* (never off client input), and then verifies membership the same way. This guarantees workspace isolation regardless of how a resource is addressed - see docs/AUTHENTICATION.md for the full rationale.

Both paths converge on the same `req.workspaceMembership` shape, so `authorize()`, `requireRole()`, and `allowPermissionOrOwner()` work identically downstream.

## 5. Database architecture

See docs/DATABASE.md for the full schema reference. In summary: every workspace-owned collection carries a `workspaceId` field with a leading compound index, and every read/write path is scoped by a verified `workspaceId` (never a client-asserted one) - see "Data isolation strategy" in docs/DATABASE.md.

## 6. Service / repository responsibilities

- **Repositories** (`src/repositories/*.repository.ts`) are the only files that import Mongoose models directly for queries. Each extends `BaseRepository<T>` for common CRUD and adds collection-specific finders/filters. They contain no business rules.
- **Services** (`src/services/*.service.ts`) contain all business logic: validation that requires a DB lookup (e.g. duplicate project keys, dependency cycles), orchestration across multiple repositories, recording Activity entries, creating Notifications, and emitting Socket.IO events. Services are the only layer that calls more than one repository or triggers side effects.

## 7. Socket.IO architecture

See docs/SOCKET.IO.md for the full event catalogue. Summary: `sockets/index.ts` initializes a single Socket.IO server on the same HTTP server as Express. Every socket must authenticate with the same JWT access token used for REST (`socketAuthMiddleware`). Sockets auto-join a private `user:{userId}` room for direct notifications, and must explicitly call `workspace:join` (server re-verifies DB membership) to join a `workspace:{workspaceId}` room and receive that workspace's realtime events. `sockets/emitter.ts` exposes `emitToWorkspace()`/`emitToUserRoom()`, called exclusively from the service layer - controllers never touch sockets directly.

## 8. File upload flow

```
multipart/form-data request
 → middlewares/upload.ts (multer, memory storage, MIME + size validation)
 → controllers/attachment.controller.ts
 → services/attachment.service.ts
    - verifies the target entity (Task/Meeting/Document) belongs to the caller's workspace
    - delegates persistence to services/storage.service.ts (StorageDriver interface)
 → StorageDriver: LocalStorageDriver (disk, STORAGE_DRIVER=local)
              or CloudinaryStorageDriver (STORAGE_DRIVER=cloudinary)
 → Attachment document persisted with { url, storageKey, storageDriver }
```

Business logic never talks to `fs` or the Cloudinary SDK directly - only `storage.service.ts` does, so swapping storage backends touches one file.

## 9. Error handling flow

Every thrown error - `ApiError` from anywhere in the pipeline, Mongoose `ValidationError`/`CastError`, a MongoDB duplicate-key error, or a JWT error - is caught by the single `middlewares/errorHandler.ts` and converted to the standard `{ success:false, error:{code,message} }` shape. In production, 5xx messages are replaced with a generic message and `details` are stripped so no internals leak. See docs/API.md "Error responses" and section 23 of the top-level spec for the full code list.

## 10. Notification flow

```
Service performs a mutation (e.g. task assigned)
 → services/notification.service.ts: createNotification() / notifyUsers()
    - persists a Notification document
    - emits `notification.created` to the recipient's `user:{userId}` socket room
 → Client: GET /api/notifications, PATCH /api/notifications/:id/read
```

## 11. Activity flow

```
Service performs an important mutation
 → services/activity.service.ts: recordActivity()
    - persists an Activity document (actor, type, entity, metadata)
    - emits `activity.created` to the workspace's socket room
 → Client: GET /api/workspaces/:workspaceId/activities
```

## 12. Search architecture

`services/search.service.ts` implements search with per-collection MongoDB `$text` indexes for the MVP (Project, Task, Meeting, Decision, Document) plus a regex-based member name/email search. Each entity type is behind its own small function; swapping to MongoDB Atlas Search later only requires changing those function bodies, not `search.controller.ts` or the route. See docs/PERFORMANCE.md for indexing details and known limitations of the mixed-type search pagination.
