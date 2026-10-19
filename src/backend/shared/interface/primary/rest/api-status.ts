export enum HttpStatusCode {
  OK = 200,
  FOUND = 302,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  UNPROCESSABLE_ENTITY = 422,
  INTERNAL_SERVER_ERROR = 500,
}

export enum ApplicationStatusCode {
  AUTH_SUCCESS = 120001000,
  AUTH_REQUIRED = 140101001,
  GOOGLE_AUTH_FAILED = 140101002,
  ORIGIN_NOT_ALLOWED = 140301001,
  ONBOARDING_REQUIRED = 140301002,
  INVALID_REDIRECT_TO = 142201002,
  INVALID_OAUTH_CALLBACK = 142201003,
  UNHANDLED_AUTH_EXCEPTION = 150001999,
  USER_PROFILE_SUCCESS = 120002000,
  USER_PROFILE_UNAUTHORIZED = 140102001,
  UNHANDLED_USER_PROFILE_EXCEPTION = 150002999,
  PERSONALIZATION_SUCCESS = 120003000,
  PERSONALIZATION_UNAUTHORIZED = 140103001,
  PERSONALIZATION_VALIDATION_ERROR = 142203001,
  PERSONALIZATION_INVALID_REFERENCE = 142203002,
  UNHANDLED_PERSONALIZATION_EXCEPTION = 150003999,
  SYLLABUS_SUCCESS = 120004000,
  SYLLABUS_UNAUTHORIZED = 140104001,
  SYLLABUS_ONBOARDING_REQUIRED = 140304001,
  SYLLABUS_UNIT_NOT_FOUND = 140404001,
  SYLLABUS_LESSON_NOT_FOUND = 140404002,
  SYLLABUS_INVALID_FILTER = 142204001,
  UNHANDLED_SYLLABUS_EXCEPTION = 150004999,
  PROGRESS_SUCCESS = 120007000,
  PROGRESS_UNAUTHORIZED = 140107001,
  PROGRESS_ONBOARDING_REQUIRED = 140307001,
  PROGRESS_VALIDATION_ERROR = 142207001,
  UNHANDLED_PROGRESS_EXCEPTION = 150007999,
}

export const applicationStatus = {
  [ApplicationStatusCode.AUTH_SUCCESS]: {
    httpStatus: HttpStatusCode.OK,
    message: 'Success!',
  },
  [ApplicationStatusCode.AUTH_REQUIRED]: {
    httpStatus: HttpStatusCode.UNAUTHORIZED,
    message: 'Authentication required.',
  },
  [ApplicationStatusCode.GOOGLE_AUTH_FAILED]: {
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
  [ApplicationStatusCode.USER_PROFILE_SUCCESS]: {
    httpStatus: HttpStatusCode.OK,
    message: 'Success!',
  },
  [ApplicationStatusCode.USER_PROFILE_UNAUTHORIZED]: {
    httpStatus: HttpStatusCode.UNAUTHORIZED,
    message: 'Unauthorized.',
  },
  [ApplicationStatusCode.UNHANDLED_USER_PROFILE_EXCEPTION]: {
    httpStatus: HttpStatusCode.INTERNAL_SERVER_ERROR,
    message: 'Unhandled user profile exception.',
  },
  [ApplicationStatusCode.PERSONALIZATION_SUCCESS]: {
    httpStatus: HttpStatusCode.OK,
    message: 'Success!',
  },
  [ApplicationStatusCode.PERSONALIZATION_UNAUTHORIZED]: {
    httpStatus: HttpStatusCode.UNAUTHORIZED,
    message: 'Unauthorized.',
  },
  [ApplicationStatusCode.PERSONALIZATION_VALIDATION_ERROR]: {
    httpStatus: HttpStatusCode.UNPROCESSABLE_ENTITY,
    message: 'Validation error.',
  },
  [ApplicationStatusCode.PERSONALIZATION_INVALID_REFERENCE]: {
    httpStatus: HttpStatusCode.UNPROCESSABLE_ENTITY,
    message: 'Invalid personalization confirmation payload.',
  },
  [ApplicationStatusCode.UNHANDLED_PERSONALIZATION_EXCEPTION]: {
    httpStatus: HttpStatusCode.INTERNAL_SERVER_ERROR,
    message: 'Unhandled personalization exception.',
  },
  [ApplicationStatusCode.SYLLABUS_SUCCESS]: {
    httpStatus: HttpStatusCode.OK,
    message: 'Success!',
  },
  [ApplicationStatusCode.SYLLABUS_UNAUTHORIZED]: {
    httpStatus: HttpStatusCode.UNAUTHORIZED,
    message: 'Unauthorized.',
  },
  [ApplicationStatusCode.SYLLABUS_ONBOARDING_REQUIRED]: {
    httpStatus: HttpStatusCode.FORBIDDEN,
    message: 'Forbidden.',
  },
  [ApplicationStatusCode.SYLLABUS_UNIT_NOT_FOUND]: {
    httpStatus: HttpStatusCode.NOT_FOUND,
    message: 'Syllabus unit not found.',
  },
  [ApplicationStatusCode.SYLLABUS_LESSON_NOT_FOUND]: {
    httpStatus: HttpStatusCode.NOT_FOUND,
    message: 'Syllabus lesson not found.',
  },
  [ApplicationStatusCode.SYLLABUS_INVALID_FILTER]: {
    httpStatus: HttpStatusCode.UNPROCESSABLE_ENTITY,
    message: 'Invalid syllabus filter.',
  },
  [ApplicationStatusCode.UNHANDLED_SYLLABUS_EXCEPTION]: {
    httpStatus: HttpStatusCode.INTERNAL_SERVER_ERROR,
    message: 'Unhandled syllabus exception.',
  },
  [ApplicationStatusCode.PROGRESS_SUCCESS]: {
    httpStatus: HttpStatusCode.OK,
    message: 'Success!',
  },
  [ApplicationStatusCode.PROGRESS_UNAUTHORIZED]: {
    httpStatus: HttpStatusCode.UNAUTHORIZED,
    message: 'Unauthorized.',
  },
  [ApplicationStatusCode.PROGRESS_ONBOARDING_REQUIRED]: {
    httpStatus: HttpStatusCode.FORBIDDEN,
    message: 'Forbidden.',
  },
  [ApplicationStatusCode.PROGRESS_VALIDATION_ERROR]: {
    httpStatus: HttpStatusCode.UNPROCESSABLE_ENTITY,
    message: 'Validation error.',
  },
  [ApplicationStatusCode.UNHANDLED_PROGRESS_EXCEPTION]: {
    httpStatus: HttpStatusCode.INTERNAL_SERVER_ERROR,
    message: 'Unhandled progress exception.',
  },
} satisfies Record<ApplicationStatusCode, { httpStatus: HttpStatusCode; message: string }>;

export const applicationErrorDetailMessage = {
  [ApplicationStatusCode.INVALID_REDIRECT_TO]: 'redirectTo must be a safe relative path.',
  [ApplicationStatusCode.INVALID_OAUTH_CALLBACK]: 'Required callback value is missing.',
} as const;
