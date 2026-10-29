export interface StoreError {
  message: string;
  code: number | string | null;
  traceId: string | null;
  fieldErrors: readonly { field: string; message: string }[];
}
