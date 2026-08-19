// =============================================================
// VIRAL KAR — Standard API Response Interfaces
// All API responses conform to these shapes.
// =============================================================

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

export interface ApiPaginatedResponse<T = unknown> {
  success: true;
  statusCode: number;
  message: string;
  data: T[];
  pagination: PaginationMeta;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
  path: string;
  method: string;
  timestamp: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;
