import { Model, FilterQuery, UpdateQuery, Types, AnyKeys } from 'mongoose';

export class BaseRepository<T> {
  constructor(protected readonly model: Model<T>) {}

  async create(data: AnyKeys<T>) {
    return this.model.create(data);
  }

  async findById(id: string | Types.ObjectId, projection?: string) {
    return this.model.findById(id).select(projection ?? '');
  }

  async findOne(filter: FilterQuery<T>, projection?: string) {
    return this.model.findOne(filter).select(projection ?? '');
  }

  async find(filter: FilterQuery<T>) {
    return this.model.find(filter);
  }

  async count(filter: FilterQuery<T>) {
    return this.model.countDocuments(filter);
  }

  async updateById(id: string | Types.ObjectId, update: UpdateQuery<T>) {
    return this.model.findByIdAndUpdate(id, update, { new: true, runValidators: true });
  }

  async deleteById(id: string | Types.ObjectId) {
    return this.model.findByIdAndDelete(id);
  }

  async deleteMany(filter: FilterQuery<T>) {
    return this.model.deleteMany(filter);
  }
}
