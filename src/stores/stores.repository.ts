import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Store } from './schemas/store.schema';

@Injectable()
export class StoresRepository {
  constructor(@InjectModel(Store.name) public readonly storeModel: Model<Store>) {}

  async findById(id: string): Promise<Store | null> {
    return this.storeModel
      .findOne({ _id: id, deletedAt: null })
      .lean()
      .exec() as unknown as Promise<Store | null>;
  }

  async findBySlug(slug: string): Promise<Store | null> {
    return this.storeModel
      .findOne({ slug, deletedAt: null })
      .lean()
      .exec() as unknown as Promise<Store | null>;
  }

  async findByOwner(ownerId: string): Promise<Store | null> {
    return this.storeModel
      .findOne({ owner: ownerId, deletedAt: null })
      .lean()
      .exec() as unknown as Promise<Store | null>;
  }

  async create(data: Partial<Store>): Promise<Store> {
    const store = new this.storeModel(data);
    return store.save();
  }

  async update(id: string, data: Partial<Store>): Promise<Store | null> {
    return this.storeModel
      .findByIdAndUpdate(id, data, { new: true })
      .lean()
      .exec() as unknown as Promise<Store | null>;
  }
}
