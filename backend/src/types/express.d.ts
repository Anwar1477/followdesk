import { WorkspaceRole } from '../constants/enums';
import { AuthenticatedUser } from '../utils/jwt';

declare global {
  namespace Express {
    interface Request {
      /** Set by the `authenticate` middleware from a verified JWT. Never trust client-supplied user data instead of this. */
      user?: AuthenticatedUser;
      /** Set by the `requireWorkspaceMember` middleware after verifying membership in the DB. */
      workspaceMembership?: {
        workspaceId: string;
        role: WorkspaceRole;
        memberId: string;
      };
      /** Set by resolveWorkspaceFromParam so downstream authorization checks (e.g. "assignee or manager") can reuse the already-fetched entity instead of re-querying. */
      resolvedEntity?: unknown;
    }
  }
}

export {};
