import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendList } from '../utils/ApiResponse';
import * as documentService from '../services/document.service';

export const createDocument = asyncHandler(async (req: Request, res: Response) => {
  const document = await documentService.createDocument(req.params.workspaceId, req.user!.id, req.body);
  sendSuccess(res, document, 201);
});

export const listDocuments = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, ...filters } = req.query as Record<string, string>;
  const { items, pagination } = await documentService.listDocuments(
    { workspaceId: req.params.workspaceId, ...filters },
    { page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined }
  );
  sendList(res, items, pagination);
});

export const getDocument = asyncHandler(async (req: Request, res: Response) => {
  const document = await documentService.getDocument(req.params.documentId, req.workspaceMembership!.workspaceId);
  sendSuccess(res, document);
});

export const updateDocument = asyncHandler(async (req: Request, res: Response) => {
  const document = await documentService.updateDocument(req.params.documentId, req.workspaceMembership!.workspaceId, req.user!.id, req.body);
  sendSuccess(res, document);
});

export const deleteDocument = asyncHandler(async (req: Request, res: Response) => {
  await documentService.deleteDocument(req.params.documentId, req.workspaceMembership!.workspaceId);
  sendSuccess(res, { message: 'Document deleted successfully' });
});

export const createFolder = asyncHandler(async (req: Request, res: Response) => {
  const folder = await documentService.createFolder(req.params.workspaceId, req.user!.id, req.body);
  sendSuccess(res, folder, 201);
});

export const listFolders = asyncHandler(async (req: Request, res: Response) => {
  const folders = await documentService.listFolders(req.params.workspaceId, req.query.projectId as string | undefined);
  sendSuccess(res, folders);
});

export const deleteFolder = asyncHandler(async (req: Request, res: Response) => {
  await documentService.deleteFolder(req.params.folderId, req.workspaceMembership!.workspaceId);
  sendSuccess(res, { message: 'Folder deleted successfully' });
});
