import { presentResponse } from '@/app/api/present-response';

export function withLocalizedResponse<TRequest extends Request, TContext extends unknown[]>(
  handler: (request: TRequest, ...context: TContext) => Response | Promise<Response>,
) {
  return async (request: TRequest, ...context: TContext): Promise<Response> =>
    presentResponse(request, handler(request, ...context));
}
