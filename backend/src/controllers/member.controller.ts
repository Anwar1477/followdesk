import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';
import * as memberService from '../services/member.service';

export const inviteMember = asyncHandler(async (req: Request, res: Response) => {
  const membership = await memberService.inviteMember(req.params.workspaceId, req.user!.id, req.body);
  sendSuccess(res, membership, 201);
});

export const listMembers = asyncHandler(async (req: Request, res: Response) => {
  const members = await memberService.listMembers(req.params.workspaceId);
  sendSuccess(res, members);
});

export const updateMemberRole = asyncHandler(async (req: Request, res: Response) => {
  const membership = await memberService.updateMemberRole(req.params.workspaceId, req.params.userId, req.body.role, req.user!.id);
  sendSuccess(res, membership);
});

export const removeMember = asyncHandler(async (req: Request, res: Response) => {
  await memberService.removeMember(req.params.workspaceId, req.params.userId, req.user!.id);
  sendSuccess(res, { message: 'Member removed successfully' });
});
