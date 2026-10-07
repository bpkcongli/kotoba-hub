import type { ApplicationStatusCode } from '@/backend/shared/interface/primary/rest/api-status';

export interface ApiErrorDetailDto {
  field: string;
  message: string;
}

export interface ApiStatusDto {
  traceId: string;
  code: ApplicationStatusCode;
  message: string;
  errorDetails: ApiErrorDetailDto[];
}

export interface ApiResponseDto<TData = unknown> {
  status: ApiStatusDto;
  data?: TData;
}
