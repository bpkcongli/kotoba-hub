import type { FrontendBootstrapData } from './FrontendBootstrapData';

export interface FrontendContainerOptions {
  apiBasePath: '/api/v1';
  requestTimeoutMs: number;
  bootstrap?: FrontendBootstrapData;
}
