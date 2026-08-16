export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface NormalizedPagination {
  page: number;
  limit: number;
  skip: number;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function normalizePagination(query: PaginationQuery): NormalizedPagination {
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(query.limit ?? DEFAULT_LIMIT)));
  return { page, limit, skip: (page - 1) * limit };
}
