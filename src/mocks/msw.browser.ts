import { setupWorker } from 'msw/browser';
import { handlers } from './msw.router';

export const worker = setupWorker(...handlers);
