import { PaginationMeta } from '../interfaces/api-response.interface';

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

export function buildPaginatedResult<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
): PaginatedResult<T> {
  return {
    data,
    pagination: buildPaginationMeta(page, limit, total),
  };
}

export function buildPrismaOrderBy(
  sortBy?: string,
  sortOrder: 'asc' | 'desc' = 'desc',
): Record<string, 'asc' | 'desc'> | undefined {
  if (!sortBy) return undefined;
  return { [sortBy]: sortOrder };
}
