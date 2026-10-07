export enum HttpStatusCode {
  OK = 200,
  FOUND = 302,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  UNPROCESSABLE_ENTITY = 422,
  INTERNAL_SERVER_ERROR = 500,
}

export enum ApplicationStatusCode {
  SUCCESS = 120001000,
  AUTHENTICATION_REQUIRED = 140101001,
  GOOGLE_AUTHENTICATION_FAILED = 140101002,
  ORIGIN_NOT_ALLOWED = 140301001,
  ONBOARDING_REQUIRED = 140301002,
  INVALID_REDIRECT_TO = 142201002,
  INVALID_OAUTH_CALLBACK = 142201003,
  UNHANDLED_AUTH_EXCEPTION = 150001999,
}

export const applicationStatus = {
  [ApplicationStatusCode.SUCCESS]: { httpStatus: HttpStatusCode.OK, message: 'Success!' },
  [ApplicationStatusCode.AUTHENTICATION_REQUIRED]: {
    httpStatus: HttpStatusCode.UNAUTHORIZED,
    message: 'Authentication required.',
  },
  [ApplicationStatusCode.GOOGLE_AUTHENTICATION_FAILED]: {
    httpStatus: HttpStatusCode.UNAUTHORIZED,
    message: 'Google authentication failed.',
  },
  [ApplicationStatusCode.ORIGIN_NOT_ALLOWED]: {
    httpStatus: HttpStatusCode.FORBIDDEN,
    message: 'Request origin is not allowed.',
  },
  [ApplicationStatusCode.ONBOARDING_REQUIRED]: {
    httpStatus: HttpStatusCode.FORBIDDEN,
    message: 'Complete onboarding to access this resource.',
  },
  [ApplicationStatusCode.INVALID_REDIRECT_TO]: {
    httpStatus: HttpStatusCode.UNPROCESSABLE_ENTITY,
    message: 'Invalid redirectTo.',
  },
  [ApplicationStatusCode.INVALID_OAUTH_CALLBACK]: {
    httpStatus: HttpStatusCode.UNPROCESSABLE_ENTITY,
    message: 'Invalid OAuth callback payload.',
  },
  [ApplicationStatusCode.UNHANDLED_AUTH_EXCEPTION]: {
    httpStatus: HttpStatusCode.INTERNAL_SERVER_ERROR,
    message: 'Unhandled auth exception.',
  },
} satisfies Record<ApplicationStatusCode, { httpStatus: HttpStatusCode; message: string }>;

export const applicationErrorDetailMessage = {
  [ApplicationStatusCode.INVALID_REDIRECT_TO]: 'redirectTo must be a safe relative path.',
  [ApplicationStatusCode.INVALID_OAUTH_CALLBACK]: 'Required callback value is missing.',
} as const;
