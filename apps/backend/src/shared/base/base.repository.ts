import { PaginatedResult, buildPaginatedResult } from '../../common/helpers/pagination.helper';

export interface FindManyOptions {
  page?: number;
  limit?: number;
  where?: Record<string, unknown>;
  orderBy?: Record<string, 'asc' | 'desc'>;
  include?: Record<string, unknown>;
}

export abstract class BaseRepository<T> {
  protected abstract model: {
    findUnique: (args: Record<string, unknown>) => Promise<T | null>;
    findMany: (args: Record<string, unknown>) => Promise<T[]>;
    create: (args: Record<string, unknown>) => Promise<T>;
    update: (args: Record<string, unknown>) => Promise<T>;
    delete: (args: Record<string, unknown>) => Promise<T>;
    count: (args?: Record<string, unknown>) => Promise<number>;
  };

  async findById(id: string, include?: Record<string, unknown>): Promise<T | null> {
    return this.model.findUnique({ where: { id }, include });
  }

  async findPaginated(options: FindManyOptions): Promise<PaginatedResult<T>> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.model.findMany({
        where: options.where,
        orderBy: options.orderBy,
        include: options.include,
        skip,
        take: limit,
      }),
      this.model.count({ where: options.where }),
    ]);

    return buildPaginatedResult(data, page, limit, total);
  }
}
