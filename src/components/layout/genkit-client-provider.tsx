// src/components/layout/genkit-client-provider.tsx
"use client";
// import { GenkitProvider } from '@genkit-ai/next/client'; // This export was not found in @genkit-ai/next@1.8.0
import type { PropsWithChildren } from 'react';

export function GenkitClientProvider({ children }: PropsWithChildren) {
  // TODO: Set up auth if needed.
  // The GenkitProvider component previously imported from '@genkit-ai/next/client'
  // is not available in the current version. If client-side Genkit context or
  // initialization is needed, it would be handled here. For now, we pass children through.
  return <>{children}</>;
}
