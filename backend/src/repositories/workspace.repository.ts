import { WorkspaceModel, IWorkspace } from '../models/Workspace';
import { BaseRepository } from './base.repository';

class WorkspaceRepository extends BaseRepository<IWorkspace> {
  constructor() {
    super(WorkspaceModel);
  }

  async findBySlug(slug: string) {
    return this.model.findOne({ slug });
  }

  async slugExists(slug: string) {
    return this.model.exists({ slug });
  }
}

export const workspaceRepository = new WorkspaceRepository();
