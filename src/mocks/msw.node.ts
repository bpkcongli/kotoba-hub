import { setupServer } from 'msw/node';
import { handlers } from './msw.router';

export const server = setupServer(...handlers);
