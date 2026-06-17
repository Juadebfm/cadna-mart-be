import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category } from './schemas/category.schema';

@Injectable()
export class CategoriesRepository {
  constructor(@InjectModel(Category.name) public readonly categoryModel: Model<Category>) {}

  async findAll(includeCounts: boolean): Promise<Category[]> {
    const query = this.categoryModel
      .find({ deletedAt: null, isActive: true })
      .sort({ order: 1, name: 1 });

    if (!includeCounts) {
      query.select('-productCount');
    }

    return query.lean().exec() as unknown as Promise<Category[]>;
  }

  async findBySlug(slug: string): Promise<Category | null> {
    return this.categoryModel
      .findOne({ slug, deletedAt: null })
      .lean()
      .exec() as unknown as Promise<Category | null>;
  }

  async findById(id: string): Promise<Category | null> {
    return this.categoryModel
      .findOne({ _id: id, deletedAt: null })
      .lean()
      .exec() as unknown as Promise<Category | null>;
  }

  async create(data: Partial<Category>): Promise<Category> {
    const category = new this.categoryModel(data);
    return category.save();
  }

  async update(id: string, data: Partial<Category>): Promise<Category | null> {
    return this.categoryModel
      .findByIdAndUpdate(id, data, { new: true })
      .lean()
      .exec() as unknown as Promise<Category | null>;
  }

  async incrementProductCount(categoryId: string, amount: number): Promise<void> {
    await this.categoryModel.updateOne({ _id: categoryId }, { $inc: { productCount: amount } });
  }
}
