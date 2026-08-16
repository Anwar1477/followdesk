import { WorkspaceMemberModel, IWorkspaceMember } from '../models/WorkspaceMember';
import { BaseRepository } from './base.repository';
import { WorkspaceRole } from '../constants/enums';

class WorkspaceMemberRepository extends BaseRepository<IWorkspaceMember> {
  constructor() {
    super(WorkspaceMemberModel);
  }

  async findMembership(workspaceId: string, userId: string) {
    return this.model.findOne({ workspaceId, userId });
  }

  async listByWorkspace(workspaceId: string) {
    return this.model.find({ workspaceId }).populate('userId', 'name email avatarUrl').sort({ createdAt: 1 });
  }

  async listByUser(userId: string) {
    return this.model.find({ userId }).populate('workspaceId').sort({ createdAt: -1 });
  }

  async countAdmins(workspaceId: string) {
    return this.model.countDocuments({ workspaceId, role: WorkspaceRole.ADMIN });
  }

  async removeMembership(workspaceId: string, userId: string) {
    return this.model.findOneAndDelete({ workspaceId, userId });
  }

  async isMember(workspaceId: string, userId: string) {
    return this.model.exists({ workspaceId, userId });
  }

  async listUserIdsByWorkspace(workspaceId: string): Promise<string[]> {
    const ids = await this.model.distinct('userId', { workspaceId });
    return ids.map((id) => id.toString());
  }
}

export const workspaceMemberRepository = new WorkspaceMemberRepository();
