import { z } from 'zod';
import { WorkspaceRole } from '../constants/enums';

export const inviteMemberSchema = z.object({
  email: z.string().trim().email(),
  role: z.nativeEnum(WorkspaceRole).optional(),
});

export const updateMemberRoleSchema = z.object({
  role: z.nativeEnum(WorkspaceRole),
});
