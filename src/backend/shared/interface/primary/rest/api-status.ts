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
  // Auth
  AUTH_SUCCESS = 120001000,
  AUTH_REQUIRED = 140101001,
  GOOGLE_AUTH_FAILED = 140101002,
  ORIGIN_NOT_ALLOWED = 140301001,
  ONBOARDING_REQUIRED = 140301002,
  INVALID_REDIRECT_TO = 142201002,
  INVALID_OAUTH_CALLBACK = 142201003,
  UNHANDLED_AUTH_EXCEPTION = 150001999,
  // User
  USER_PROFILE_SUCCESS = 120002000,
  USER_PROFILE_UNAUTHORIZED = 140102001,
  UNHANDLED_USER_PROFILE_EXCEPTION = 150002999,
  // Personalization
  PERSONALIZATION_SUCCESS = 120003000,
  PERSONALIZATION_UNAUTHORIZED = 140103001,
  PERSONALIZATION_VALIDATION_ERROR = 142203001,
  PERSONALIZATION_INVALID_REFERENCE = 142203002,
  UNHANDLED_PERSONALIZATION_EXCEPTION = 150003999,
  // Syllabus
  SYLLABUS_SUCCESS = 120004000,
  SYLLABUS_UNAUTHORIZED = 140104001,
  SYLLABUS_ONBOARDING_REQUIRED = 140304001,
  SYLLABUS_UNIT_NOT_FOUND = 140404001,
  SYLLABUS_LESSON_NOT_FOUND = 140404002,
  SYLLABUS_INVALID_FILTER = 142204001,
  UNHANDLED_SYLLABUS_EXCEPTION = 150004999,
  // Flashcard
  FLASHCARDS_SUCCESS = 120005000,
  FLASHCARDS_UNAUTHORIZED = 140105001,
  FLASHCARDS_ONBOARDING_REQUIRED = 140305001,
  FLASHCARDS_DECK_NOT_FOUND = 140405001,
  FLASHCARDS_SESSION_NOT_FOUND = 140405002,
  FLASHCARDS_ITEM_NOT_FOUND = 140405003,
  FLASHCARDS_VALIDATION_ERROR = 142205001,
  FLASHCARDS_INVALID_ITEM = 142205002,
  FLASHCARDS_INVALID_CONTENT_TYPE = 142205003,
  FLASHCARDS_INVALID_SCRIPT_PAIR = 142205004,
  FLASHCARDS_INVALID_CURRENT_ITEM = 142205005,
  FLASHCARDS_INVALID_OPTION = 142205006,
  UNHANDLED_FLASHCARDS_EXCEPTION = 150005999,
  // Practice
  PRACTICE_SUCCESS = 120006000,
  PRACTICE_UNAUTHORIZED = 140106001,
  PRACTICE_ONBOARDING_REQUIRED = 140306001,
  PRACTICE_SESSION_NOT_FOUND = 140406001,
  PRACTICE_LESSON_NOT_FOUND = 140406002,
  PRACTICE_VALIDATION_ERROR = 142206001,
  PRACTICE_INVALID_QUESTION = 142206002,
  UNHANDLED_PRACTICE_EXCEPTION = 150006999,
  // Progress
  PROGRESS_SUCCESS = 120007000,
  PROGRESS_UNAUTHORIZED = 140107001,
  PROGRESS_ONBOARDING_REQUIRED = 140307001,
  PROGRESS_VALIDATION_ERROR = 142207001,
  UNHANDLED_PROGRESS_EXCEPTION = 150007999,
}

export const applicationStatus = {
  // Auth
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

  // User
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

  // Personalization
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

  // Syllabus
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

  // Flashcard
  [ApplicationStatusCode.FLASHCARDS_SUCCESS]: {
    httpStatus: HttpStatusCode.OK,
    message: 'Success!',
  },
  [ApplicationStatusCode.FLASHCARDS_UNAUTHORIZED]: {
    httpStatus: HttpStatusCode.UNAUTHORIZED,
    message: 'Unauthorized.',
  },
  [ApplicationStatusCode.FLASHCARDS_ONBOARDING_REQUIRED]: {
    httpStatus: HttpStatusCode.FORBIDDEN,
    message: 'Forbidden.',
  },
  [ApplicationStatusCode.FLASHCARDS_DECK_NOT_FOUND]: {
    httpStatus: HttpStatusCode.NOT_FOUND,
    message: 'Flashcard deck not found.',
  },
  [ApplicationStatusCode.FLASHCARDS_SESSION_NOT_FOUND]: {
    httpStatus: HttpStatusCode.NOT_FOUND,
    message: 'Flashcard session not found.',
  },
  [ApplicationStatusCode.FLASHCARDS_ITEM_NOT_FOUND]: {
    httpStatus: HttpStatusCode.NOT_FOUND,
    message: 'Flashcard item not found.',
  },
  [ApplicationStatusCode.FLASHCARDS_VALIDATION_ERROR]: {
    httpStatus: HttpStatusCode.UNPROCESSABLE_ENTITY,
    message: 'Invalid flashcard payload.',
  },
  [ApplicationStatusCode.FLASHCARDS_INVALID_ITEM]: {
    httpStatus: HttpStatusCode.UNPROCESSABLE_ENTITY,
    message: 'Invalid custom flashcard deck item.',
  },
  [ApplicationStatusCode.FLASHCARDS_INVALID_CONTENT_TYPE]: {
    httpStatus: HttpStatusCode.UNPROCESSABLE_ENTITY,
    message: 'Invalid custom flashcard deck content type.',
  },
  [ApplicationStatusCode.FLASHCARDS_INVALID_SCRIPT_PAIR]: {
    httpStatus: HttpStatusCode.UNPROCESSABLE_ENTITY,
    message: 'Invalid flashcard session payload.',
  },
  [ApplicationStatusCode.FLASHCARDS_INVALID_CURRENT_ITEM]: {
    httpStatus: HttpStatusCode.UNPROCESSABLE_ENTITY,
    message: 'Invalid flashcard answer payload.',
  },
  [ApplicationStatusCode.FLASHCARDS_INVALID_OPTION]: {
    httpStatus: HttpStatusCode.UNPROCESSABLE_ENTITY,
    message: 'Invalid flashcard answer payload.',
  },
  [ApplicationStatusCode.UNHANDLED_FLASHCARDS_EXCEPTION]: {
    httpStatus: HttpStatusCode.INTERNAL_SERVER_ERROR,
    message: 'Unhandled flashcards exception.',
  },

  // Practice
  [ApplicationStatusCode.PRACTICE_SUCCESS]: {
    httpStatus: HttpStatusCode.OK,
    message: 'Success!',
  },
  [ApplicationStatusCode.PRACTICE_UNAUTHORIZED]: {
    httpStatus: HttpStatusCode.UNAUTHORIZED,
    message: 'Unauthorized.',
  },
  [ApplicationStatusCode.PRACTICE_ONBOARDING_REQUIRED]: {
    httpStatus: HttpStatusCode.FORBIDDEN,
    message: 'Complete onboarding to access practice.',
  },
  [ApplicationStatusCode.PRACTICE_SESSION_NOT_FOUND]: {
    httpStatus: HttpStatusCode.NOT_FOUND,
    message: 'Practice session not found.',
  },
  [ApplicationStatusCode.PRACTICE_LESSON_NOT_FOUND]: {
    httpStatus: HttpStatusCode.NOT_FOUND,
    message: 'Published lesson not found.',
  },
  [ApplicationStatusCode.PRACTICE_VALIDATION_ERROR]: {
    httpStatus: HttpStatusCode.UNPROCESSABLE_ENTITY,
    message: 'Invalid practice payload.',
  },
  [ApplicationStatusCode.PRACTICE_INVALID_QUESTION]: {
    httpStatus: HttpStatusCode.UNPROCESSABLE_ENTITY,
    message: 'Question does not match the active practice target.',
  },
  [ApplicationStatusCode.UNHANDLED_PRACTICE_EXCEPTION]: {
    httpStatus: HttpStatusCode.INTERNAL_SERVER_ERROR,
    message: 'Unhandled practice exception.',
  },

  // Progress
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
