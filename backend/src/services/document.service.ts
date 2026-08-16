import { documentRepository, documentFolderRepository, DocumentListFilter } from '../repositories/document.repository';
import { ApiError } from '../utils/ApiError';
import { ActivityType, DocumentVisibility } from '../constants/enums';
import { recordActivity } from './activity.service';
import { normalizePagination, PaginationQuery } from '../utils/pagination';
import { buildPagination } from '../utils/ApiResponse';
import { slugWithSuffix } from '../utils/slug';

export interface CreateDocumentInput {
  projectId?: string;
  folderId?: string;
  title: string;
  content: string;
  visibility?: DocumentVisibility;
  tags?: string[];
}

export async function createDocument(workspaceId: string, authorId: string, data: CreateDocumentInput) {
  let slug = slugWithSuffix(data.title);
  while (await documentRepository.slugExists(workspaceId, slug)) {
    slug = slugWithSuffix(data.title);
  }

  const document = await documentRepository.create({
    workspaceId,
    projectId: data.projectId,
    folderId: data.folderId,
    title: data.title,
    slug,
    content: data.content,
    authorId,
    visibility: data.visibility,
    tags: data.tags ?? [],
  });

  await recordActivity({
    workspaceId,
    projectId: data.projectId,
    actorId: authorId,
    type: ActivityType.DOCUMENT_CREATED,
    entityType: 'Document',
    entityId: document._id.toString(),
    metadata: { title: document.title },
  });

  return document;
}

export async function listDocuments(filter: DocumentListFilter, query: PaginationQuery) {
  const { page, limit, skip } = normalizePagination(query);
  const { items, total } = await documentRepository.list(filter, skip, limit);
  return { items, pagination: buildPagination(page, limit, total) };
}

export async function getDocument(documentId: string, workspaceId: string) {
  const document = await documentRepository.findByIdInWorkspace(documentId, workspaceId);
  if (!document) throw ApiError.notFound('Document not found');
  return document;
}

export interface UpdateDocumentInput {
  title?: string;
  content?: string;
  folderId?: string | null;
  visibility?: DocumentVisibility;
  tags?: string[];
}

export async function updateDocument(documentId: string, workspaceId: string, actorId: string, data: UpdateDocumentInput) {
  const document = await getDocument(documentId, workspaceId);
  Object.assign(document, data);
  await document.save();

  await recordActivity({
    workspaceId,
    projectId: document.projectId?.toString(),
    actorId,
    type: ActivityType.DOCUMENT_UPDATED,
    entityType: 'Document',
    entityId: document._id.toString(),
    metadata: { changes: Object.keys(data) },
  });

  return document;
}

export async function deleteDocument(documentId: string, workspaceId: string) {
  const document = await getDocument(documentId, workspaceId);
  await documentRepository.deleteById(document._id.toString());
}

export async function createFolder(workspaceId: string, createdBy: string, data: { name: string; projectId?: string; parentId?: string }) {
  return documentFolderRepository.create({ workspaceId, name: data.name, projectId: data.projectId, parentId: data.parentId, createdBy });
}

export async function listFolders(workspaceId: string, projectId?: string) {
  return documentFolderRepository.listByWorkspace(workspaceId, projectId);
}

export async function deleteFolder(folderId: string, workspaceId: string) {
  const folder = await documentFolderRepository.findByIdInWorkspace(folderId, workspaceId);
  if (!folder) throw ApiError.notFound('Folder not found');
  const docsInFolder = await documentRepository.count({ workspaceId, folderId });
  if (docsInFolder > 0) throw ApiError.conflict('Cannot delete a folder that still contains documents');
  await documentFolderRepository.deleteById(folder._id.toString());
}
