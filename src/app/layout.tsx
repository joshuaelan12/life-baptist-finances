import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { GenkitClientProvider } from '@/components/layout/genkit-client-provider';

// Note: GeistSans and GeistMono are imported as objects directly.
// We don't need to call them as functions like fonts from next/font/google.
// Their .variable property provides the necessary class name.

export const metadata: Metadata = {
  title: 'Life Baptist Finances',
  description: 'Financial management for Life Baptist Church Mutengene',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}>
        <GenkitClientProvider>
          {children}
          <Toaster />
        </GenkitClientProvider>
      </body>
    </html>
  );
}
