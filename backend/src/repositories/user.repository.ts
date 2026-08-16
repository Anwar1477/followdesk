import { UserModel, IUser } from '../models/User';
import { BaseRepository } from './base.repository';

class UserRepository extends BaseRepository<IUser> {
  constructor() {
    super(UserModel);
  }

  async findByEmail(email: string, withPassword = false) {
    const query = this.model.findOne({ email: email.toLowerCase().trim() });
    if (withPassword) query.select('+passwordHash');
    return query;
  }

  async findByIdWithPassword(id: string) {
    return this.model.findById(id).select('+passwordHash');
  }

  async findByResetTokenHash(hash: string) {
    return this.model
      .findOne({ passwordResetTokenHash: hash, passwordResetExpiresAt: { $gt: new Date() } })
      .select('+passwordResetTokenHash +passwordResetExpiresAt +passwordHash');
  }

  async searchByIds(ids: string[]) {
    return this.model.find({ _id: { $in: ids } });
  }

  async searchByText(query: string, limit: number) {
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    return this.model.find({ $or: [{ name: regex }, { email: regex }] }).limit(limit);
  }
}

export const userRepository = new UserRepository();
