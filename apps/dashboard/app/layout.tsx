import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import TanstackProvider from '@/providers/TanstackProvider';
import { TooltipProvider } from '@/components/ui/tooltip';
import '../styles/globals.css';
import { Geist } from 'next/font/google';
import { cn } from '@/lib/utils';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'MockFlow - Collaborative API Mock Server',
  description: 'Design, document, and deploy mock REST APIs with realistic data generation',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={cn('font-sans', geist.variable)}>
      <body>
        <TanstackProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </TanstackProvider>
      </body>
    </html>
  );
}
