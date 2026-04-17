import type {
  ApiErrorResponse,
  ApiResponse,
  IAdmin,
  IBusOperator,
  IUser,
} from '@ve_xe_nhanh_ts/shared-types';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
  rememberMe?: boolean;
}

export interface RefreshTokenPayload {
  refreshToken: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
}

export interface RegisterResponse extends TokenPair {
  message: string;
  user: Partial<IUser>;
}

export interface UserLoginResponse extends TokenPair {
  message: string;
  user: IUser | Record<string, unknown>;
}

export interface OperatorLoginResponse extends TokenPair {
  message: string;
  operator: IBusOperator | Record<string, unknown>;
}

export interface AdminLoginResponse extends TokenPair {
  message: string;
  admin: IAdmin | Record<string, unknown>;
}

export interface LogoutResponse {
  message: string;
}

export interface AuthTokensStorage {
  getAccessToken: () => string | null | Promise<string | null>;
  getRefreshToken: () => string | null | Promise<string | null>;
  setTokens: (tokens: TokenPair) => void | Promise<void>;
  clearTokens: () => void | Promise<void>;
}

export interface CreateApiClientOptions {
  baseURL: string;
  timeout?: number;
  withCredentials?: boolean;
  storage?: AuthTokensStorage;
  onAuthFailure?: (error: ApiErrorResponse | unknown) => void | Promise<void>;
}

export interface RequestConfig {
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export type ApiResult<T> = ApiResponse<T> | T;
