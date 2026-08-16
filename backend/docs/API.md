# FlowDesk Backend - API Reference

Base URL: `http://localhost:5000/api` (configurable via `PORT`/`API_PREFIX`, see docs/SETUP.md).

## Conventions used in this document

- **Auth**: `None` (public), or `Bearer` (requires `Authorization: Bearer <accessToken>`).
- **Role**: the workspace role required, evaluated against the permission matrix in docs/AUTHENTICATION.md. `Any member` means every workspace role (ADMIN/MANAGER/MEMBER) may call it. `Owner/Assignee or Admin/Manager` means a MEMBER may act only on a resource they own/are assigned to; ADMIN/MANAGER can always act.
- **Success envelope**: `{ "success": true, "data": ... }` for single resources, or `{ "success": true, "data": [...], "pagination": { page, limit, total, totalPages } }` for lists. Shown once here, not repeated per endpoint.
- **Error envelope**: `{ "success": false, "error": { "code": "...", "message": "..." } }`. Codes: `UNAUTHORIZED` (401), `FORBIDDEN` (403), `VALIDATION_ERROR` (422), `NOT_FOUND` (404), `CONFLICT` (409), `RATE_LIMITED` (429), `INTERNAL_ERROR` (500). Shown once here, not repeated per endpoint - each endpoint below lists which of these codes it can realistically return.
- **Pagination query params** (all list endpoints): `page` (default 1), `limit` (default 20, max 100).
- IDs in URLs are MongoDB ObjectIds; an invalid one returns `422 VALIDATION_ERROR`.

---

## Auth (`/api/auth`)

| Method | URL | Auth | Role |
|---|---|---|---|
| POST | `/auth/register` | None | - |
| POST | `/auth/login` | None | - |
| POST | `/auth/refresh` | None (refresh cookie or body) | - |
| POST | `/auth/logout` | Bearer | - |
| GET | `/auth/me` | Bearer | - |
| PATCH | `/auth/me` | Bearer | - |
| POST | `/auth/change-password` | Bearer | - |
| POST | `/auth/forgot-password` | None | - |
| POST | `/auth/reset-password` | None | - |

### POST /api/auth/register
Body: `{ name: string, email: string, password: string }` (password: 8+ chars, upper+lower+digit).
Success 201: `{ user: {id,name,email,avatarUrl?,createdAt}, accessToken }` (refresh token set as httpOnly cookie).
Errors: 422 VALIDATION_ERROR, 409 CONFLICT (email taken).

```http
POST /api/auth/register
Content-Type: application/json

{ "name": "Ava Admin", "email": "ava@example.com", "password": "Password123" }
```
```json
{ "success": true, "data": { "user": { "id": "665f1...", "name": "Ava Admin", "email": "ava@example.com", "createdAt": "2026-01-01T00:00:00.000Z" }, "accessToken": "eyJ..." } }
```

### POST /api/auth/login
Body: `{ email, password }`. Success 200: `{ user, accessToken }`. Errors: 401 UNAUTHORIZED.

### POST /api/auth/refresh
Body: `{ refreshToken? }` (optional if the httpOnly cookie is present). Success 200: `{ accessToken }`. Errors: 401 UNAUTHORIZED (missing/invalid/revoked).

### POST /api/auth/logout
Auth required. Revokes all outstanding refresh tokens (bumps `tokenVersion`) and clears the cookie. Success 200: `{ message }`.

### GET /api/auth/me
Auth required. Success 200: the current user's public profile.

### PATCH /api/auth/me
Auth required. Body: `{ name?, avatarUrl? }`. Success 200: updated public profile. Errors: 422 VALIDATION_ERROR.

### POST /api/auth/change-password
Auth required. Body: `{ currentPassword, newPassword }`. Revokes other sessions. Success 200: `{ message }`. Errors: 401 UNAUTHORIZED (wrong current password), 422 VALIDATION_ERROR.

### POST /api/auth/forgot-password
Body: `{ email }`. Always 200 regardless of whether the account exists (`{ message }`; in non-production also includes `resetToken` for local testing - see docs/AUTHENTICATION.md).

### POST /api/auth/reset-password
Body: `{ token, newPassword }`. Success 200: `{ message }`. Errors: 422 VALIDATION_ERROR (invalid/expired token).

---

## Users (`/api/users`)

| Method | URL | Auth | Role |
|---|---|---|---|
| GET | `/users/me` | Bearer | - |
| PATCH | `/users/me` | Bearer | - |

Identical behavior to `/api/auth/me` (alias mount) - kept for REST-conventional client code that expects a `/users` resource.

---

## Workspaces (`/api/workspaces`)

| Method | URL | Auth | Role |
|---|---|---|---|
| POST | `/workspaces` | Bearer | - (creator becomes ADMIN) |
| GET | `/workspaces` | Bearer | - (lists caller's memberships) |
| GET | `/workspaces/:workspaceId` | Bearer | Any member |
| PATCH | `/workspaces/:workspaceId` | Bearer | Admin |
| DELETE | `/workspaces/:workspaceId` | Bearer | Admin |

### POST /api/workspaces
Body: `{ name: string, description?: string }`. Success 201: the Workspace document. The creator is automatically added as an ADMIN `WorkspaceMember`. Errors: 422 VALIDATION_ERROR.

```json
{ "success": true, "data": { "_id": "665f2...", "name": "Acme", "slug": "acme-x7f3q1", "ownerId": "665f1...", "createdAt": "...", "updatedAt": "..." } }
```

### GET /api/workspaces
Success 200: `[{ workspace, role, joinedAt }]` for every workspace the caller belongs to.

### GET/PATCH/DELETE /api/workspaces/:workspaceId
Standard CRUD. PATCH body: `{ name?, description? }`. DELETE cascades every workspace-owned collection (members, projects, tasks, comments, meetings, notes, decisions, documents, folders, notifications, activities, attachments - including deleting stored files). Errors: 403 FORBIDDEN (not a member / not admin), 404 NOT_FOUND.

---

## Members (`/api/workspaces/:workspaceId/members`)

| Method | URL | Auth | Role |
|---|---|---|---|
| GET | `/workspaces/:workspaceId/members` | Bearer | Any member |
| POST | `/workspaces/:workspaceId/members` | Bearer | Admin |
| PATCH | `/workspaces/:workspaceId/members/:userId` | Bearer | Admin |
| DELETE | `/workspaces/:workspaceId/members/:userId` | Bearer | Admin |

### POST /api/workspaces/:workspaceId/members
Adds an **existing** FlowDesk user to the workspace by email (see docs/AUTHENTICATION.md - no outbound invite email is sent). Body: `{ email: string, role?: 'ADMIN'|'MANAGER'|'MEMBER' }` (default MEMBER). Success 201: the WorkspaceMember document. Notifies the invited user (`WORKSPACE_INVITE`) and records an Activity. Errors: 404 NOT_FOUND (no account for that email), 409 CONFLICT (already a member).

### PATCH /api/workspaces/:workspaceId/members/:userId
Body: `{ role }`. Blocks demoting the workspace's last remaining ADMIN. Errors: 404 NOT_FOUND, 409 CONFLICT.

### DELETE /api/workspaces/:workspaceId/members/:userId
Blocks removing the workspace's last remaining ADMIN. Errors: 404 NOT_FOUND, 409 CONFLICT.

---

## Projects

| Method | URL | Auth | Role |
|---|---|---|---|
| GET | `/workspaces/:workspaceId/projects` | Bearer | Any member |
| POST | `/workspaces/:workspaceId/projects` | Bearer | Admin/Manager |
| GET | `/projects/:projectId` | Bearer | Any member |
| PATCH | `/projects/:projectId` | Bearer | Admin/Manager |
| DELETE | `/projects/:projectId` | Bearer | Admin/Manager |
| GET | `/projects/:projectId/analytics` | Bearer | Any member (limited for Member) |
| GET | `/projects/:projectId/health` | Bearer | Any member |

### GET /workspaces/:workspaceId/projects
Query: `page, limit, status?, priority?, ownerId?, memberId?, search?`. Success 200: paginated Project list.

### POST /workspaces/:workspaceId/projects
Body: `{ name, key (2-10 alphanumeric, unique per workspace), description?, status?, priority?, startDate?, dueDate?, members?: [userId] }`. Statuses: `PLANNING|ACTIVE|ON_HOLD|COMPLETED|ARCHIVED`. Priorities: `LOW|MEDIUM|HIGH|URGENT`. Success 201: the Project (uppercased key). Records `PROJECT_CREATED` activity. Errors: 403 FORBIDDEN, 409 CONFLICT (duplicate key), 422 VALIDATION_ERROR.

```json
{ "name": "Website Relaunch", "key": "WEB", "priority": "HIGH", "dueDate": "2026-03-01" }
```

### GET/PATCH/DELETE /projects/:projectId
PATCH body: any subset of `{ name, description, status, priority, ownerId, startDate, dueDate, members }`. DELETE cascades the project's tasks, task comments, and their attachments. Both record an Activity. Errors: 403 FORBIDDEN, 404 NOT_FOUND.

### GET /projects/:projectId/analytics
Success 200 (Admin/Manager): `{ completionRate, tasksByStatus, tasksByPriority, tasksByMember, overdueTasks, activityTrend, health }`. Success 200 (Member): `{ completionRate, tasksByStatus, overdueTasks, health }` (trimmed).

### GET /projects/:projectId/health
Success 200: `{ health: 'HEALTHY'|'NEEDS_ATTENTION'|'AT_RISK', score: 0-100, reasons: string[], metrics: {...} }`. See docs/ARCHITECTURE.md and `services/projectHealth.service.ts` for the deterministic scoring rules.

---

## Tasks

| Method | URL | Auth | Role |
|---|---|---|---|
| GET | `/workspaces/:workspaceId/tasks` | Bearer | Any member |
| POST | `/workspaces/:workspaceId/tasks` | Bearer | Any member |
| GET | `/tasks/:taskId` | Bearer | Any member |
| PATCH | `/tasks/:taskId` | Bearer | Assignee, or Admin/Manager |
| DELETE | `/tasks/:taskId` | Bearer | Admin/Manager |
| POST | `/tasks/:taskId/dependencies` | Bearer | Assignee, or Admin/Manager |
| DELETE | `/tasks/:taskId/dependencies/:dependencyId` | Bearer | Assignee, or Admin/Manager |
| GET | `/tasks/:taskId/attachments` | Bearer | Any member |
| POST | `/tasks/:taskId/attachments` | Bearer | Any member |

### GET /workspaces/:workspaceId/tasks
Query: `page, limit, projectId?, status?, priority?, assigneeId?, label?, search?, dueBefore?, dueAfter?`. Statuses: `TODO|IN_PROGRESS|IN_REVIEW|BLOCKED|DONE`.

### POST /workspaces/:workspaceId/tasks
Body: `{ projectId, title, description?, status?, priority?, assigneeId?, labels?, dueDate?, dependsOn?: [taskId] }`. Success 201: the Task. Emits `task.created`; notifies the assignee (`TASK_ASSIGNED`) if set; records `TASK_CREATED`. Errors: 422 VALIDATION_ERROR (bad project/dependency).

### PATCH /tasks/:taskId
Body: any subset of `{ title, description, status, priority, assigneeId, labels, dueDate }`. Setting `status: DONE` stamps `completedAt`; moving away from DONE clears it. Emits `task.updated`, and `task.moved`/`task.completed` when `status` changes; notifies the assignee on status/assignment change. Errors: 403 FORBIDDEN, 404 NOT_FOUND, 422 VALIDATION_ERROR.

### DELETE /tasks/:taskId
Blocked with 409 CONFLICT if another task depends on this one.

### POST /tasks/:taskId/dependencies
Body: `{ dependsOnTaskId }`. Rejects self-dependency, a task from a different workspace, a task from a different project, an already-existing dependency, or one that would create a cycle - all `422 VALIDATION_ERROR` (except the duplicate case, `409 CONFLICT`). See docs/DATABASE.md Task.dependsOn.

### DELETE /tasks/:taskId/dependencies/:dependencyId
Removes the dependency edge (no error if it didn't exist).

### GET/POST /tasks/:taskId/attachments
POST is `multipart/form-data` with a `file` field (≤ `MAX_UPLOAD_SIZE_MB`, allow-listed MIME types - see docs/SETUP.md). Success 201: the Attachment document `{ url, fileName, mimeType, sizeBytes, storageDriver, ... }`.

---

## Task Comments

| Method | URL | Auth | Role |
|---|---|---|---|
| GET | `/tasks/:taskId/comments` | Bearer | Any member |
| POST | `/tasks/:taskId/comments` | Bearer | Any member |
| PATCH | `/comments/:commentId` | Bearer | Author |
| DELETE | `/comments/:commentId` | Bearer | Author, or Admin/Manager |

### POST /tasks/:taskId/comments
Body: `{ content: string }`. `@email` substrings matching a workspace member's email are auto-resolved to `mentions` and trigger a `MENTION` notification (excluding the author); the task's assignee is also notified (`COMMENT`) unless they're the author or already mentioned. Emits `comment.created`; records `COMMENT_ADDED`.

### PATCH/DELETE /comments/:commentId
PATCH body: `{ content }`; re-resolves mentions. Only the author may edit; the author or an Admin/Manager may delete. Errors: 403 FORBIDDEN, 404 NOT_FOUND.

---

## Meetings

| Method | URL | Auth | Role |
|---|---|---|---|
| GET | `/workspaces/:workspaceId/meetings` | Bearer | Any member |
| POST | `/workspaces/:workspaceId/meetings` | Bearer | Any member |
| GET | `/meetings/:meetingId` | Bearer | Any member |
| PATCH | `/meetings/:meetingId` | Bearer | Organizer, or Admin/Manager |
| POST | `/meetings/:meetingId/cancel` | Bearer | Organizer, or Admin/Manager |
| DELETE | `/meetings/:meetingId` | Bearer | Organizer, or Admin/Manager |
| POST | `/meetings/:meetingId/participants` | Bearer | Organizer, or Admin/Manager |
| GET | `/meetings/:meetingId/attachments` | Bearer | Any member |
| POST | `/meetings/:meetingId/attachments` | Bearer | Any member |

### POST /workspaces/:workspaceId/meetings
Body: `{ projectId?, title, description?, scheduledAt (ISO date), durationMinutes?, participants?: [userId] }`. The organizer is always included in `participants`. Statuses: `SCHEDULED|COMPLETED|CANCELLED`. Notifies invitees (`MEETING_INVITE`).

### PATCH /meetings/:meetingId
Body: subset of `{ title, description, status, scheduledAt, durationMinutes }`. Emits `meeting.updated`.

### POST /meetings/:meetingId/cancel
Sets `status: CANCELLED`. Emits `meeting.updated`; records `MEETING_CANCELLED`.

### POST /meetings/:meetingId/participants
Body: `{ participantIds: [userId] }`. Notifies newly-added participants.

---

## Meeting Notes & Action Items

| Method | URL | Auth | Role |
|---|---|---|---|
| GET | `/meetings/:meetingId/notes` | Bearer | Any member |
| POST | `/meetings/:meetingId/notes` | Bearer | Any member |
| GET | `/meeting-notes/:noteId` | Bearer | Any member |
| PATCH | `/meeting-notes/:noteId` | Bearer | Any member |
| DELETE | `/meeting-notes/:noteId` | Bearer | Any member |
| POST | `/meeting-notes/:noteId/action-items` | Bearer | Any member |
| PATCH | `/meeting-notes/:noteId/action-items/:itemId` | Bearer | Any member |
| DELETE | `/meeting-notes/:noteId/action-items/:itemId` | Bearer | Any member |
| POST | `/meeting-notes/:noteId/action-items/:itemId/convert` | Bearer | Any member |

### POST /meetings/:meetingId/notes
Body: `{ content?, actionItems?: [{ title, assigneeId?, dueDate? }] }`. Success 201: the MeetingNote.

### POST /meeting-notes/:noteId/action-items/:itemId/convert
Body: `{ projectId }`. Converts an embedded action item into a real Task: creates the Task (title/assignee/dueDate copied over), links `actionItem.taskId`, records `ACTION_ITEM_CONVERTED`, notifies the assignee (`TASK_ASSIGNED`), and emits `task.created`. Errors: 409 CONFLICT (already converted), 422 VALIDATION_ERROR (project not in this workspace).

```json
{ "note": { "...": "MeetingNote with actionItems[].taskId now set" }, "task": { "...": "the newly created Task" } }
```

---

## Decisions (Decision Memory)

| Method | URL | Auth | Role |
|---|---|---|---|
| GET | `/workspaces/:workspaceId/decisions` | Bearer | Any member |
| POST | `/workspaces/:workspaceId/decisions` | Bearer | Admin/Manager |
| GET | `/decisions/:decisionId` | Bearer | Any member |
| PATCH | `/decisions/:decisionId` | Bearer | Admin/Manager |
| POST | `/decisions/:decisionId/archive` | Bearer | Admin/Manager |
| POST | `/decisions/:decisionId/supersede` | Bearer | Admin/Manager |

### GET /workspaces/:workspaceId/decisions
Query: `page, limit, projectId?, status?, tag?, search?`. Statuses: `ACTIVE|REVIEWED|SUPERSEDED|ARCHIVED`.

### POST /workspaces/:workspaceId/decisions
Body: `{ projectId?, title, decision, reason?, alternatives?, impact?, meetingId?, relatedTaskIds?: [taskId], tags?: [string] }`. Success 201. Records `DECISION_CREATED`.

```json
{
  "title": "Use Next.js for the marketing site",
  "decision": "Adopt Next.js (App Router) for the relaunch.",
  "reason": "Best balance of SEO, DX, and existing React expertise.",
  "alternatives": "Considered Astro and plain Vite+React.",
  "tags": ["frontend", "architecture"]
}
```

### PATCH /decisions/:decisionId
Body: subset of `{ title, decision, reason, alternatives, impact, status, relatedTaskIds, tags }`. Emits `decision.updated`; records `DECISION_UPDATED`.

### POST /decisions/:decisionId/archive
Shortcut for `PATCH { status: 'ARCHIVED' }`.

### POST /decisions/:decisionId/supersede
Body: `{ title, decision, reason?, alternatives?, impact?, tags? }`. Creates a **new** Decision carrying `supersedes` back to the old one; the old decision is set to `status: SUPERSEDED` with `supersededBy` pointing forward - both documents are preserved (see docs/DATABASE.md). Success 201: `{ previous, next }`. Errors: 409 CONFLICT (already superseded).

---

## Documents (Knowledge Base)

| Method | URL | Auth | Role |
|---|---|---|---|
| GET | `/workspaces/:workspaceId/documents` | Bearer | Any member |
| POST | `/workspaces/:workspaceId/documents` | Bearer | Any member |
| GET | `/workspaces/:workspaceId/documents/folders` | Bearer | Any member |
| POST | `/workspaces/:workspaceId/documents/folders` | Bearer | Any member |
| GET | `/documents/:documentId` | Bearer | Any member |
| PATCH | `/documents/:documentId` | Bearer | Author, or Admin/Manager |
| DELETE | `/documents/:documentId` | Bearer | Admin/Manager |
| DELETE | `/document-folders/:folderId` | Bearer | Admin/Manager |
| GET | `/documents/:documentId/attachments` | Bearer | Any member |
| POST | `/documents/:documentId/attachments` | Bearer | Any member |

### GET /workspaces/:workspaceId/documents
Query: `page, limit, projectId?, folderId?, visibility?, tag?, search?`. Visibility: `WORKSPACE|PROJECT|PRIVATE`.

### POST /workspaces/:workspaceId/documents
Body: `{ projectId?, folderId?, title, content, visibility?, tags? }`. A unique, URL-safe `slug` is generated from the title. Records `DOCUMENT_CREATED`.

### DELETE /document-folders/:folderId
Blocked with 409 CONFLICT while the folder still contains documents.

---

## Search

| Method | URL | Auth | Role |
|---|---|---|---|
| GET | `/search` | Bearer | Any member of `workspaceId` |

### GET /search
Query: `q (required), workspaceId (required), type? (PROJECT\|TASK\|MEETING\|DECISION\|DOCUMENT\|MEMBER), projectId?, page, limit`. `workspaceId` is passed as a query param (not a URL segment) but membership is still independently verified server-side before any results are returned - see docs/AUTHENTICATION.md. Without `type`, results are merged across all entity types (see docs/PERFORMANCE.md for the pagination caveat of the merged mode). Errors: 403 FORBIDDEN (not a member of `workspaceId`).

```json
{ "success": true, "data": [ { "type": "TASK", "id": "665f...", "title": "Build homepage hero section", "snippet": "...", "projectId": "665f..." } ], "pagination": { "page": 1, "limit": 20, "total": 3, "totalPages": 1 } }
```

---

## Analytics

| Method | URL | Auth | Role |
|---|---|---|---|
| GET | `/workspaces/:workspaceId/analytics` | Bearer | Any member (limited for Member) |
| GET | `/projects/:projectId/analytics` | Bearer | Any member (limited for Member) |

### GET /workspaces/:workspaceId/analytics
Success 200 (Admin/Manager): `{ totalProjects, activeProjects, completedProjects, projectsByStatus, totalTasks, completedTasks, overdueTasks, blockedTasks, tasksByStatus }`. Success 200 (Member): `{ totalProjects, activeProjects, completedProjects, totalTasks, completedTasks, overdueTasks }`.

---

## Activities

| Method | URL | Auth | Role |
|---|---|---|---|
| GET | `/workspaces/:workspaceId/activities` | Bearer | Any member |

Query: `page, limit, projectId?`. Returns the newest-first Activity feed with `actorId` populated (`name, email, avatarUrl`).

---

## Notifications

| Method | URL | Auth | Role |
|---|---|---|---|
| GET | `/notifications` | Bearer | - (caller's own) |
| PATCH | `/notifications/read-all` | Bearer | - |
| PATCH | `/notifications/:id/read` | Bearer | - (must own the notification) |

### GET /notifications
Query: `page, limit, unreadOnly?`. Always scoped to `req.user.id` - there is no way to read another user's notifications.

---

## Attachments

| Method | URL | Auth | Role |
|---|---|---|---|
| DELETE | `/attachments/:attachmentId` | Bearer | Uploader, or Admin/Manager |

Upload/list endpoints live under their owning resource (`/tasks/:taskId/attachments`, `/meetings/:meetingId/attachments`, `/documents/:documentId/attachments`) - see those sections above.

---

## Health

| Method | URL | Auth |
|---|---|---|
| GET | `/health` | None |

Success 200 (or 503 if the database is down): `{ status: 'ok'|'degraded', uptimeSeconds, database: 'connected'|'disconnected', timestamp }`. Excluded from request logging noise; see docs/SETUP.md.
