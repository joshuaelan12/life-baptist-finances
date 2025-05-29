// src/components/layout/genkit-client-provider.tsx
"use client";
import { GenkitProvider } from '@genkit-ai/next/client';
import type { PropsWithChildren } from 'react';

export function GenkitClientProvider({ children }: PropsWithChildren) {
  // TODO: Set up auth if needed.
  return <GenkitProvider>{children}</GenkitProvider>;
}
