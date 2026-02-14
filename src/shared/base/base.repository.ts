import { Model, FilterQuery, UpdateQuery, QueryOptions } from 'mongoose';
import { PaginationMeta, PaginatedResult } from '@common/interfaces/api-response.interface';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';

export abstract class BaseRepository<T> {
  constructor(protected readonly model: Model<T>) {}

  async findById(id: string): Promise<T | null> {
    return this.model
      .findOne({ _id: id, deletedAt: null } as FilterQuery<T>)
      .exec() as Promise<T | null>;
  }

  async findOne(filter: FilterQuery<T>): Promise<T | null> {
    return this.model
      .findOne({ ...filter, deletedAt: null } as FilterQuery<T>)
      .exec() as Promise<T | null>;
  }

  async findAll(
    filter: FilterQuery<T> = {} as FilterQuery<T>,
    paginationQuery?: PaginationQueryDto,
  ): Promise<PaginatedResult<T>> {
    const page = paginationQuery?.page || 1;
    const limit = paginationQuery?.limit || 10;
    const sort = paginationQuery?.sort || 'createdAt';
    const order = paginationQuery?.order === 'asc' ? 1 : -1;
    const skip = (page - 1) * limit;

    const queryFilter = { ...filter, deletedAt: null } as FilterQuery<T>;

    const [data, total] = await Promise.all([
      this.model
        .find(queryFilter)
        .sort({ [sort]: order })
        .skip(skip)
        .limit(limit)
        .exec() as Promise<T[]>,
      this.model.countDocuments(queryFilter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);
    const meta: PaginationMeta = {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };

    return { data, meta };
  }

  async create(data: Partial<T>): Promise<T> {
    const created = new this.model(data);
    return created.save() as Promise<T>;
  }

  async update(id: string, data: UpdateQuery<T>, options?: QueryOptions): Promise<T | null> {
    return this.model
      .findOneAndUpdate({ _id: id, deletedAt: null } as FilterQuery<T>, data, {
        new: true,
        ...options,
      })
      .exec() as Promise<T | null>;
  }

  async softDelete(id: string): Promise<T | null> {
    return this.model
      .findOneAndUpdate(
        { _id: id, deletedAt: null } as FilterQuery<T>,
        { deletedAt: new Date() } as UpdateQuery<T>,
        { new: true },
      )
      .exec() as Promise<T | null>;
  }

  async count(filter: FilterQuery<T> = {} as FilterQuery<T>): Promise<number> {
    return this.model.countDocuments({ ...filter, deletedAt: null } as FilterQuery<T>).exec();
  }
}
