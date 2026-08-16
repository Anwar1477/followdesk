import { FilterQuery } from 'mongoose';
import { DocumentModel, IDocument, DocumentFolderModel, IDocumentFolder } from '../models/Document';
import { BaseRepository } from './base.repository';

export interface DocumentListFilter {
  workspaceId: string;
  projectId?: string;
  folderId?: string;
  visibility?: string;
  tag?: string;
  search?: string;
}

class DocumentRepository extends BaseRepository<IDocument> {
  constructor() {
    super(DocumentModel);
  }

  buildFilter(filter: DocumentListFilter): FilterQuery<IDocument> {
    const query: FilterQuery<IDocument> = { workspaceId: filter.workspaceId };
    if (filter.projectId) query.projectId = filter.projectId;
    if (filter.folderId) query.folderId = filter.folderId;
    if (filter.visibility) query.visibility = filter.visibility;
    if (filter.tag) query.tags = filter.tag;
    if (filter.search) query.$text = { $search: filter.search };
    return query;
  }

  async list(filter: DocumentListFilter, skip: number, limit: number) {
    const query = this.buildFilter(filter);
    const [items, total] = await Promise.all([
      this.model.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit),
      this.model.countDocuments(query),
    ]);
    return { items, total };
  }

  async findByIdInWorkspace(id: string, workspaceId: string) {
    return this.model.findOne({ _id: id, workspaceId });
  }

  async slugExists(workspaceId: string, slug: string) {
    return this.model.exists({ workspaceId, slug });
  }
}

export const documentRepository = new DocumentRepository();

class DocumentFolderRepository extends BaseRepository<IDocumentFolder> {
  constructor() {
    super(DocumentFolderModel);
  }

  async listByWorkspace(workspaceId: string, projectId?: string) {
    const query: FilterQuery<IDocumentFolder> = { workspaceId };
    if (projectId) query.projectId = projectId;
    return this.model.find(query).sort({ name: 1 });
  }

  async findByIdInWorkspace(id: string, workspaceId: string) {
    return this.model.findOne({ _id: id, workspaceId });
  }
}

export const documentFolderRepository = new DocumentFolderRepository();
