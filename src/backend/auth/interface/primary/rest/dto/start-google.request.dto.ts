export interface StartGoogleRequestDto {
  redirectTo: string | null;
}

export function readStartGoogleRequest(request: Request): StartGoogleRequestDto {
  return { redirectTo: new URL(request.url).searchParams.get('redirectTo') };
}
