# FlowDesk Backend - Performance Considerations

## Pagination

Every list endpoint is paginated (`page`, `limit`, default 20, max 100 - `utils/pagination.ts`). No endpoint returns an unbounded collection; `limit` is hard-capped server-side regardless of what the client requests, so a client cannot force a full-collection scan-and-return.

## Database indexes

Every workspace-owned collection leads its compound indexes with `workspaceId` so workspace-scoped queries (the overwhelming majority of traffic) hit an index rather than a collection scan. Full list in docs/DATABASE.md; highlights:

- `Task`: `{workspaceId, projectId, status}` for board views, `{workspaceId, assigneeId, status}` for "my tasks", `dueDate` for overdue queries, plus a text index for search.
- `Project`: `{workspaceId, key}` unique (also enforces the business rule), `{workspaceId, status}`.
- `WorkspaceMember`: `{workspaceId, userId}` unique - membership checks (which run on nearly every request via `requireWorkspaceMember`/`resolveWorkspaceFromParam`) are a single indexed point lookup.
- `Notification`: `{userId, read, createdAt}` for the common "unread, newest first" query.
- `Activity`: `{workspaceId, createdAt}` and `{projectId, createdAt}` for feed pagination.

## Efficient queries / avoiding unnecessary round-trips

- Repositories run list + count in `Promise.all` (one round-trip pair, not sequential) - see e.g. `project.repository.ts#list`.
- `requireWorkspaceMember`/`resolveWorkspaceFromParam` perform exactly one membership lookup per request (indexed), not a join-like fetch of the whole membership list.
- `allowPermissionOrOwner` reuses the entity already loaded by `resolveWorkspaceFromParam` (`req.resolvedEntity`) instead of re-querying it to check ownership.

## MongoDB aggregation

`services/analytics.service.ts` computes workspace and project analytics with `$match`/`$group` aggregation pipelines (status/priority/assignee breakdowns, 30-day activity trend bucketed by day) rather than pulling every Task/Activity document into Node.js and reducing in memory. `services/projectHealth.service.ts` currently loads a project's tasks into memory to compute health signals - acceptable at typical project sizes (hundreds, not millions, of tasks per project) but a candidate to convert to an aggregation pipeline if project sizes grow much larger (see "Remaining limitations" in the top-level README).

## Avoiding large in-memory datasets

- Search (`services/search.service.ts`) queries each collection with its own `skip`/`limit` rather than loading full collections. The one exception is the member-search helper, which loads matching users then intersects with a workspace's member id list in memory - acceptable because workspace membership lists are small (dozens to low hundreds of users), not because it's the ideal long-term approach; a future optimization would filter membership at the query level via `$in`.
- File uploads use Multer's memory storage (buffers a single file, bounded by `MAX_UPLOAD_SIZE_MB`) rather than streaming - fine at the configured size cap; very large files would warrant streaming uploads instead.

## Socket.IO room usage

Events are always emitted to a specific room (`workspace:{id}` or `user:{id}`), never broadcast to all connected sockets - see docs/SOCKET.IO.md. This keeps event fan-out proportional to the number of clients actually interested, not the total number of connected sockets across every workspace.

## Request validation

Every external input is validated by Zod **before** it reaches a controller (`middlewares/validate.ts`), so malformed/oversized payloads are rejected cheaply (422) before any database work happens. String fields carry explicit `maxlength` at the schema (Mongoose) layer as a second line of defense.

## Caching

No response caching layer is implemented in this MVP - every request hits MongoDB. Given FlowDesk's read/write mix (frequent mutations - task status changes, comments - relative to reads), a naive cache would need careful invalidation to avoid staleness; if added later, the best first candidates are workspace analytics (`GET /workspaces/:workspaceId/analytics`) and project health (`GET /projects/:projectId/health`), which are read-heavy, computation-heavy, and tolerate a few seconds of staleness.

## Known limitation: mixed-type search pagination

When `GET /api/search` is called **without** a `type` filter, results are fetched independently from each collection (each capped at `limit`) and then merged/sliced in memory. This means `page` beyond 1 on an unfiltered search is approximate rather than exact per-entity pagination - pass `type` to get precise pagination within a single entity type. This is called out explicitly rather than silently accepted, per `services/search.service.ts`'s doc comment.
