// Standard REST envelope returned by every endpoint.
export interface ModelBaseResponse<T> {
  succeeded: boolean;
  data: T;
  message: string;
  errors?: Record<string, string[]>;
}
