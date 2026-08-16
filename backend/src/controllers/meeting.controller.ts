import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendList } from '../utils/ApiResponse';
import * as meetingService from '../services/meeting.service';

export const createMeeting = asyncHandler(async (req: Request, res: Response) => {
  const meeting = await meetingService.createMeeting(req.params.workspaceId, req.user!.id, req.body);
  sendSuccess(res, meeting, 201);
});

export const listMeetings = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, ...filters } = req.query as Record<string, string>;
  const { items, pagination } = await meetingService.listMeetings(
    { workspaceId: req.params.workspaceId, ...filters },
    { page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined }
  );
  sendList(res, items, pagination);
});

export const getMeeting = asyncHandler(async (req: Request, res: Response) => {
  const meeting = await meetingService.getMeeting(req.params.meetingId, req.workspaceMembership!.workspaceId);
  sendSuccess(res, meeting);
});

export const updateMeeting = asyncHandler(async (req: Request, res: Response) => {
  const meeting = await meetingService.updateMeeting(req.params.meetingId, req.workspaceMembership!.workspaceId, req.user!.id, req.body);
  sendSuccess(res, meeting);
});

export const cancelMeeting = asyncHandler(async (req: Request, res: Response) => {
  const meeting = await meetingService.cancelMeeting(req.params.meetingId, req.workspaceMembership!.workspaceId, req.user!.id);
  sendSuccess(res, meeting);
});

export const deleteMeeting = asyncHandler(async (req: Request, res: Response) => {
  await meetingService.deleteMeeting(req.params.meetingId, req.workspaceMembership!.workspaceId);
  sendSuccess(res, { message: 'Meeting deleted successfully' });
});

export const addParticipants = asyncHandler(async (req: Request, res: Response) => {
  const meeting = await meetingService.addParticipants(
    req.params.meetingId,
    req.workspaceMembership!.workspaceId,
    req.user!.id,
    req.body.participantIds
  );
  sendSuccess(res, meeting);
});
