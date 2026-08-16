# FlowDesk Backend - Troubleshooting

## MongoDB connection failed

**Problem:** Server logs `MongoDB connection error` on startup, or `/api/health` reports `"database": "disconnected"`.
**Cause:** `MONGODB_URI` is wrong/unreachable, MongoDB isn't running (local), Atlas Network Access doesn't allow your IP, or the database user's credentials are wrong.
**Solution:** Verify `MONGODB_URI` in `.env`. For local MongoDB, confirm the `mongod` process is running. For Atlas, confirm the cluster is not paused, the database user exists with the right password (URL-encode special characters in the password), and your current IP is allow-listed under Network Access.

## Invalid JWT / "Invalid or expired access token"

**Problem:** Requests to protected routes return `401 UNAUTHORIZED`.
**Cause:** Missing/malformed `Authorization` header, an expired access token (default 15 minutes), or `JWT_ACCESS_SECRET` was changed/differs between the token issuer and verifier (e.g. after a redeploy with a new secret).
**Solution:** Send `Authorization: Bearer <accessToken>`. Call `POST /api/auth/refresh` (with the refresh cookie/body) to get a new access token instead of re-logging in. Ensure `JWT_ACCESS_SECRET` is stable across restarts/instances.

## CORS error in the browser console

**Problem:** Frontend requests are blocked with a CORS error.
**Cause:** The frontend's origin isn't listed in `CORS_ORIGINS`.
**Solution:** Add the exact scheme+host+port (e.g. `http://localhost:3000`) to `CORS_ORIGINS` (comma-separated for multiple origins) and restart the server. Remember the frontend must send `credentials: 'include'` for the refresh-token cookie to be set/sent cross-origin.

## Port already in use

**Problem:** `EADDRINUSE` on startup.
**Cause:** Another process (often a previous `npm run dev`/`npm start` that didn't exit) is already bound to `PORT`.
**Solution:** Stop the other process, or set a different `PORT` in `.env`.

## Environment variable missing

**Problem:** Server throws `Missing required environment variable: X` on startup and exits immediately.
**Cause:** `.env` wasn't created (`cp .env.example .env`) or a required variable was deleted.
**Solution:** Confirm `.env` exists in `backend/` and contains at minimum `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`. This check is intentionally strict outside `NODE_ENV=test` so a misconfigured deploy fails fast instead of running with insecure defaults.

## Socket.IO connection failed

**Problem:** The client's socket never connects, or immediately gets `connect_error`.
**Cause:** No JWT (or an invalid one) was passed in `auth.token`, or the frontend origin isn't in `CORS_ORIGINS`, or a proxy/load balancer in front of the API doesn't forward WebSocket upgrade headers.
**Solution:** Confirm the client passes `io(url, { auth: { token: accessToken } })` with a valid, unexpired access token. Check `CORS_ORIGINS`. If behind a reverse proxy, ensure it forwards `Upgrade`/`Connection` headers (see docs/DEPLOYMENT.md §5).

## File upload failed

**Problem:** `422 VALIDATION_ERROR` on an attachment upload, or the file never appears.
**Cause:** File exceeds `MAX_UPLOAD_SIZE_MB`, its MIME type isn't in the allow-list (`middlewares/upload.ts`), the target entity (task/meeting/document) doesn't belong to the caller's workspace, or - for `STORAGE_DRIVER=cloudinary` - Cloudinary credentials are missing/invalid.
**Solution:** Check the file size/type against `middlewares/upload.ts`. Confirm the `entityId` in the URL belongs to the workspace you're a member of. For Cloudinary, verify `CLOUDINARY_CLOUD_NAME`/`CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET`.

## Permission denied / 403 FORBIDDEN on an otherwise-valid request

**Problem:** A logged-in, workspace-member user gets `403 FORBIDDEN`.
**Cause:** Their role (MEMBER/MANAGER) doesn't have the required permission for that action - see the permission matrix in docs/AUTHENTICATION.md. Common case: a MEMBER trying to create a project or manage a decision.
**Solution:** Check the matrix; either use an account with the required role, or have an ADMIN adjust the caller's role via `PATCH /api/workspaces/:workspaceId/members/:userId`.

## Workspace access denied

**Problem:** `403 FORBIDDEN: "You are not a member of this workspace"` even though the resource id looks valid.
**Cause:** This is expected, correct behavior for workspace isolation - the caller is not a `WorkspaceMember` of the workspace that owns the resource (see docs/DATABASE.md "Data isolation strategy").
**Solution:** Add the user as a workspace member first (`POST /api/workspaces/:workspaceId/members`), or use an account that already belongs to that workspace.

## Build failure (`npm run build`)

**Problem:** `tsc` reports type errors.
**Cause:** A change introduced a type mismatch, or `tsconfig.build.json`/`tsconfig.json` was edited incorrectly.
**Solution:** Run `npm run typecheck` for the full-project check (including tests/scripts) to get more context, fix the reported errors, and re-run `npm run build`.

## Test failure (`npm test`)

**Problem:** Jest reports a failing test or hangs.
**Cause:** Most commonly a leftover unfinished promise in an async Express middleware (must be wrapped in `asyncHandler` or explicitly call `next(err)` in a catch block - see docs/ARCHITECTURE.md request lifecycle), or a genuine regression.
**Solution:** Re-run with `npm run test:watch` for faster iteration. If a request-driven test times out at 60s with no assertion failure, check that every middleware in that route's chain either runs synchronously or is wrapped in `asyncHandler`.
