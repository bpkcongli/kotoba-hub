// Anonymous example from docs/api-contract/openapi.auth.yaml, test-only until
// IMP-03/IMP-12 supply the real auth service and its shared response interface.
export function anonymousSessionResponse() {
  return {
    status: {
      traceId: '550e8400-e29b-41d4-a716-446655440000',
      code: 120001000,
      message: 'Success!',
      errorDetails: [],
    },
    data: {
      isAuthenticated: false,
      sessionId: null,
      expiresAt: null,
      user: null,
      authorization: {
        appAccess: 'ANONYMOUS',
        onboardingCompleted: null,
      },
    },
  };
}
