import { AdminRole } from '../enums';

export interface JwtPayload {
  sub: string;
  type: 'user' | 'merchant' | 'admin';
  role?: AdminRole;
  jti?: string;
  iat?: number;
  exp?: number;
}

export interface RequestWithUser {
  user: JwtPayload;
  requestId: string;
}

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type AsyncResult<T> = Promise<T>;
export type ID = string;
