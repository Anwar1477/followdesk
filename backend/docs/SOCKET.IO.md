# FlowDesk Backend - Socket.IO Reference

Implementation: `src/sockets/index.ts` (server + connection handling), `src/sockets/socketAuth.ts` (authentication), `src/sockets/emitter.ts` (typed emit helpers used by the service layer).

## Connection process

The Socket.IO server is created on the **same HTTP server** as the Express app (`server.ts`), so it shares the port configured by `PORT`.

```
Client                                   Server
  │  io(url, { auth: { token: accessToken } })
  ├────────────────────────────────────────▶
  │                                          │ socketAuthMiddleware runs
  │                                          │  - reads handshake.auth.token
  │                                          │  - jwt.verify(token, JWT_ACCESS_SECRET)
  │                                          │  - on success: socket.data = { userId, email }
  │                                          │  - on failure: connection rejected
  │  ◀── 'connect' (or connect_error) ───────┤
  │                                          │ socket auto-joins room `user:{userId}`
```

## Authentication

`socketAuthMiddleware` (registered via `io.use(...)`) requires the **same JWT access token** used for REST calls, passed as `auth.token` in the client's connection options (a fallback also accepts an `Authorization: Bearer <token>` handshake header). There is no anonymous/unauthenticated socket access - a missing or invalid token rejects the connection outright with an error passed to the client's `connect_error` event.

## Workspace rooms

Every authenticated socket automatically joins a private `user:{userId}` room (for direct, workspace-independent notifications) but must **explicitly** request to join a workspace room:

```js
socket.emit('workspace:join', workspaceId, (ack) => {
  // ack = { ok: true } or { ok: false, error: '...' }
});
```

Server-side handling (`sockets/index.ts`):

```
'workspace:join' (workspaceId)
 → validates workspaceId is a well-formed ObjectId
 → looks up WorkspaceMember(workspaceId, socket.data.userId) in MongoDB
 → on success: socket.join(`workspace:${workspaceId}`), ack({ ok: true })
 → on failure: ack({ ok: false, error: 'Not a member of this workspace' })
   (the socket is NOT joined to the room)
```

The client-supplied `workspaceId` is never trusted on its own - membership is independently verified against the database on every join request, exactly like the REST `requireWorkspaceMember` middleware.

```
'workspace:leave' (workspaceId)
 → socket.leave(`workspace:${workspaceId}`)
```

## Events emitted by the server

All emitted from the service layer via `sockets/emitter.ts` - controllers never touch sockets directly.

| Event | Room | Emitted when | Payload |
|---|---|---|---|
| `task.created` | `workspace:{workspaceId}` | A task is created (including via meeting action-item conversion) | The created Task document |
| `task.updated` | `workspace:{workspaceId}` | Any task field is updated | The updated Task document |
| `task.moved` | `workspace:{workspaceId}` | A task's `status` changes | `{ taskId, from, to }` |
| `task.completed` | `workspace:{workspaceId}` | A task's status transitions to `DONE` | The updated Task document |
| `comment.created` | `workspace:{workspaceId}` | A task comment is created | The created TaskComment document |
| `notification.created` | `user:{userId}` | Any notification is created for that user (assignment, mention, comment, due date, meeting invite, workspace invite, decision update) | The created Notification document |
| `activity.created` | `workspace:{workspaceId}` | Any Activity is recorded (see docs/ARCHITECTURE.md §11 for the full trigger list) | The created Activity document |
| `meeting.updated` | `workspace:{workspaceId}` | A meeting is updated or cancelled | The updated Meeting document |
| `decision.updated` | `workspace:{workspaceId}` | A decision is updated or superseded | The updated/new Decision document |

## Disconnect handling

```
'disconnect' (reason)
 → logged (userId, socketId, reason) for observability
 → Socket.IO automatically removes the socket from all rooms it had joined
```

## Error handling

- Handshake/auth failures reject the connection before `'connection'` fires (client receives `connect_error`).
- `workspace:join` failures are reported via the acknowledgement callback (`{ ok: false, error }`), not a thrown exception, so a bad join attempt never crashes the socket.
- Any unexpected error inside a handler is caught, logged via the shared Pino logger, and reported back through the ack callback where one exists.
- A generic `'error'` listener logs any lower-level socket transport errors.

## Client example (browser)

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', { auth: { token: accessToken } });

socket.on('connect', () => {
  socket.emit('workspace:join', workspaceId, (ack) => {
    if (!ack.ok) console.error('Failed to join workspace room:', ack.error);
  });
});

socket.on('task.updated', (task) => { /* update UI */ });
socket.on('notification.created', (notification) => { /* toast */ });
```
