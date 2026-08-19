export interface IRepository<T> {
  findById(id: string): Promise<T | null>;
}

export interface IService {
  readonly logger: unknown;
}

export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
}
