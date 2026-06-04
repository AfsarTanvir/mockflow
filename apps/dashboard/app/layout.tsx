import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import TanstackProvider from '@/providers/TanstackProvider';
import { ThemeProvider, THEME_STORAGE_KEY } from '@/providers/ThemeProvider';
import { TooltipProvider } from '@/components/ui/tooltip';
import '../styles/globals.css';
import { Geist } from 'next/font/google';
import { cn } from '@/lib/utils';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'MockFlow - Collaborative API Mock Server',
  description: 'Design, document, and deploy mock REST APIs with realistic data generation',
};

// Runs before paint to set the theme class, preventing a light/dark flash.
const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}')||'light';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={cn('font-sans', geist.variable)} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>
          <TanstackProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </TanstackProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
