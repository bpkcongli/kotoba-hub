export interface GoogleCallbackRequestDto {
  code: string | null;
  state: string | null;
  error: string | null;
}

export function readGoogleCallbackRequest(searchParams: URLSearchParams): GoogleCallbackRequestDto {
  return {
    code: searchParams.get('code'),
    state: searchParams.get('state'),
    error: searchParams.get('error'),
  };
}
