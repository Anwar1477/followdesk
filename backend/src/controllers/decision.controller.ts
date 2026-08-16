import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendList } from '../utils/ApiResponse';
import * as decisionService from '../services/decision.service';

export const createDecision = asyncHandler(async (req: Request, res: Response) => {
  const decision = await decisionService.createDecision(req.params.workspaceId, req.user!.id, req.body);
  sendSuccess(res, decision, 201);
});

export const listDecisions = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, ...filters } = req.query as Record<string, string>;
  const { items, pagination } = await decisionService.listDecisions(
    { workspaceId: req.params.workspaceId, ...filters },
    { page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined }
  );
  sendList(res, items, pagination);
});

export const getDecision = asyncHandler(async (req: Request, res: Response) => {
  const decision = await decisionService.getDecision(req.params.decisionId, req.workspaceMembership!.workspaceId);
  sendSuccess(res, decision);
});

export const updateDecision = asyncHandler(async (req: Request, res: Response) => {
  const decision = await decisionService.updateDecision(req.params.decisionId, req.workspaceMembership!.workspaceId, req.user!.id, req.body);
  sendSuccess(res, decision);
});

export const archiveDecision = asyncHandler(async (req: Request, res: Response) => {
  const decision = await decisionService.archiveDecision(req.params.decisionId, req.workspaceMembership!.workspaceId, req.user!.id);
  sendSuccess(res, decision);
});

export const supersedeDecision = asyncHandler(async (req: Request, res: Response) => {
  const result = await decisionService.supersedeDecision(req.params.decisionId, req.workspaceMembership!.workspaceId, req.user!.id, req.body);
  sendSuccess(res, result, 201);
});
