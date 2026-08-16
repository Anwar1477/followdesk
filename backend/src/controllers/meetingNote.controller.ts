import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';
import * as noteService from '../services/meetingNote.service';

export const createMeetingNote = asyncHandler(async (req: Request, res: Response) => {
  const note = await noteService.createMeetingNote(req.params.meetingId, req.workspaceMembership!.workspaceId, req.user!.id, req.body);
  sendSuccess(res, note, 201);
});

export const listMeetingNotes = asyncHandler(async (req: Request, res: Response) => {
  const notes = await noteService.listMeetingNotes(req.params.meetingId, req.workspaceMembership!.workspaceId);
  sendSuccess(res, notes);
});

export const getMeetingNote = asyncHandler(async (req: Request, res: Response) => {
  const note = await noteService.getMeetingNote(req.params.noteId, req.workspaceMembership!.workspaceId);
  sendSuccess(res, note);
});

export const updateMeetingNote = asyncHandler(async (req: Request, res: Response) => {
  const note = await noteService.updateMeetingNote(req.params.noteId, req.workspaceMembership!.workspaceId, req.body.content);
  sendSuccess(res, note);
});

export const deleteMeetingNote = asyncHandler(async (req: Request, res: Response) => {
  await noteService.deleteMeetingNote(req.params.noteId, req.workspaceMembership!.workspaceId);
  sendSuccess(res, { message: 'Meeting note deleted successfully' });
});

export const addActionItem = asyncHandler(async (req: Request, res: Response) => {
  const note = await noteService.addActionItem(req.params.noteId, req.workspaceMembership!.workspaceId, req.body);
  sendSuccess(res, note, 201);
});

export const updateActionItem = asyncHandler(async (req: Request, res: Response) => {
  const note = await noteService.updateActionItem(req.params.noteId, req.workspaceMembership!.workspaceId, req.params.itemId, req.body);
  sendSuccess(res, note);
});

export const deleteActionItem = asyncHandler(async (req: Request, res: Response) => {
  const note = await noteService.deleteActionItem(req.params.noteId, req.workspaceMembership!.workspaceId, req.params.itemId);
  sendSuccess(res, note);
});

export const convertActionItem = asyncHandler(async (req: Request, res: Response) => {
  const result = await noteService.convertActionItemToTask(
    req.params.noteId,
    req.workspaceMembership!.workspaceId,
    req.params.itemId,
    req.user!.id,
    req.body.projectId
  );
  sendSuccess(res, result, 201);
});
