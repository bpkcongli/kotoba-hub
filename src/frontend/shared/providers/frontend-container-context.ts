'use client';

import type { Container } from 'inversify';
import { createContext } from 'react';

export const FrontendContainerContext = createContext<Container | null>(null);
