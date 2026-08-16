# FlowDesk Backend - Authentication & Authorization

## Overview

FlowDesk uses **stateless JWT access tokens** plus a **rotating refresh token** delivered as an httpOnly cookie. Passwords are hashed with **bcrypt** (12 salt rounds). Nothing about identity or workspace role is ever trusted from the client - every protected route re-derives it from a verified JWT and/or a database lookup.

## Registration flow

```
POST /api/auth/register  { name, email, password }
 → validators/auth.validator.ts: registerSchema
    (email format, password complexity: 8+ chars, upper+lower+digit)
 → services/auth.service.ts: register()
    - rejects if email already exists (409 CONFLICT)
    - hashPassword() via bcryptjs (12 rounds)
    - creates the User document
    - issues an access token + refresh token pair
 → controller sets the refresh token as an httpOnly cookie and returns
   { user, accessToken } with 201
```

## Login flow

```
POST /api/auth/login  { email, password }
 → services/auth.service.ts: login()
    - looks up the user WITH the password hash (select('+passwordHash'))
    - comparePassword() via bcryptjs
    - on success: updates lastLoginAt, issues token pair
 → 401 UNAUTHORIZED on any mismatch (same generic message for "no such
   user" and "wrong password" to avoid leaking account existence)
```

## JWT generation

Two token types, both signed with `jsonwebtoken`:

| Token | Secret env var | Default TTL | Carries |
|---|---|---|---|
| Access token | `JWT_ACCESS_SECRET` | 15m (`JWT_ACCESS_EXPIRES_IN`) | `{ sub: userId, email, tokenType: 'access' }` |
| Refresh token | `JWT_REFRESH_SECRET` | 30d (`JWT_REFRESH_EXPIRES_IN`) | `{ sub: userId, tokenVersion, tokenType: 'refresh' }` |

The refresh token embeds the user's current `tokenVersion`. `User.tokenVersion` starts at 0 and is incremented on **logout** and **password change/reset** - this immediately invalidates every previously-issued refresh token (all devices/sessions), even though the JWT signature itself is still technically valid until expiry. `POST /api/auth/refresh` checks `payload.tokenVersion === user.tokenVersion` in the database before issuing a new pair.

The access token is short-lived and stateless - it is never checked against the database on each request (that's what makes it cheap to verify on every API call). Session revocation is entirely handled through `tokenVersion` + refresh rotation.

## JWT verification / protected routes

`middlewares/authenticate.ts` runs first on every protected route:

```
Authorization: Bearer <accessToken>
 → jwt.verify(token, JWT_ACCESS_SECRET)
 → req.user = { id: payload.sub, email: payload.email }
```

If the header is missing, malformed, or the token is invalid/expired, the middleware throws `ApiError.unauthorized()` (401). No route handler ever reads a user id from the request body/query/params for authorization purposes - `req.user.id` (set only here) is the single source of truth.

## Logout

```
POST /api/auth/logout
 → services/auth.service.ts: logout(userId)
    - User.tokenVersion += 1  (revokes all outstanding refresh tokens)
 → controller clears the refresh-token cookie
```

## Password reset

```
POST /api/auth/forgot-password  { email }
 → always responds 200 with a generic message, regardless of whether the
   email exists, to avoid account enumeration
 → if the user exists: generates a random 32-byte token, stores only its
   SHA-256 hash + a TTL (PASSWORD_RESET_TOKEN_TTL_MINUTES, default 30m)
 → NOTE: FlowDesk does not have an email provider wired up (see
   docs/SETUP.md). In non-production environments the raw token is
   returned in the response body for local testing; in production it is
   omitted and must be delivered by an email integration you add.

POST /api/auth/reset-password  { token, newPassword }
 → hashes the provided token and looks up a User whose
   passwordResetTokenHash matches and passwordResetExpiresAt is in the
   future
 → sets a new password hash, clears the reset token fields, increments
   tokenVersion (revokes all sessions)
```

## Role checking (workspace RBAC)

Roles are **per-workspace**, stored on `WorkspaceMember.role`: `ADMIN`, `MANAGER`, `MEMBER`. A user can hold different roles in different workspaces.

Two membership-resolution middlewares populate `req.workspaceMembership = { workspaceId, role, memberId }`:

1. `requireWorkspaceMember` - for routes nested under `/workspaces/:workspaceId/...`. Reads `:workspaceId` from the URL and looks up membership in MongoDB.
2. `resolveWorkspaceFromParam` - for flat routes (`/tasks/:taskId`, `/decisions/:decisionId`, ...). Loads the entity by its own id, reads `workspaceId` off the **stored document**, then looks up membership. This is what prevents a member of Workspace A from touching Workspace B's resources even if they know/guess a valid resource id.

Once `req.workspaceMembership` is populated, three authorization primitives consume it:

- `authorize(permission)` - checks the centralized permission matrix (`constants/permissions.ts`).
- `requireRole(...roles)` - exact role allow-list (used sparingly, e.g. workspace deletion is ADMIN-only).
- `allowPermissionOrOwner(permission, isOwnerFn)` - allows ADMIN/MANAGER via the permission matrix **or** a dynamic ownership check (e.g. a MEMBER may update a task they are assigned to, or a meeting they organized).

### Permission matrix

| Feature | Admin | Manager | Member |
|---|---|---|---|
| Workspace settings | Yes | No | No |
| Delete workspace | Yes | No | No |
| Manage members (invite/role/remove) | Yes | No | No |
| Create project | Yes | Yes | No |
| Manage project (update/delete) | Yes | Yes | No |
| Create task | Yes | Yes | Yes |
| Manage task (update/delete) | Yes | Yes | Assigned task only (update; delete requires Admin/Manager) |
| Comment on tasks | Yes | Yes | Yes |
| Edit/delete own comment | Yes | Yes | Yes |
| Delete any comment | Yes | Yes | No |
| Create meeting | Yes | Yes | Yes |
| Manage meeting (update/cancel/delete/participants) | Yes | Yes | Organizer only |
| Create decision | Yes | Yes | No (configurable - see below) |
| Manage decision (update/archive/supersede) | Yes | Yes | No |
| Create document | Yes | Yes | Yes |
| Edit document | Yes | Yes | Author only |
| Delete document | Yes | Yes | No |
| View workspace/project analytics | Yes (full) | Yes (full) | Yes (limited totals only) |
| View project health | Yes | Yes | Yes |
| View activity feed | Yes | Yes | Yes |

"Configurable" for Member decision-creation: the `Permission.DECISION_CREATE` constant and `roleHasPermission()` helper in `constants/permissions.ts` are the single place this would be extended (e.g. a future per-workspace setting) - the current implementation restricts it to Admin/Manager.

## Workspace membership checking (summary)

Every request that touches workspace-owned data passes through one of the two membership-resolution middlewares above before any service code runs. There is no code path where a service trusts a `workspaceId` supplied directly by the client without it having been independently verified against `WorkspaceMember` first.

## Example: full login → authenticated request flow

```http
POST /api/auth/login
Content-Type: application/json

{ "email": "admin@flowdesk.dev", "password": "DevPassword123" }
```

```json
{
  "success": true,
  "data": {
    "user": { "id": "665f...", "name": "Ava Admin", "email": "admin@flowdesk.dev", "createdAt": "..." },
    "accessToken": "eyJhbGciOi..."
  }
}
```

```http
GET /api/workspaces/665f.../projects
Authorization: Bearer eyJhbGciOi...
```
