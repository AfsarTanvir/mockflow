'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { cn } from '@/lib/utils';
import { GithubIcon } from './github-icon';
import { REPO_URL } from './about';

const NAV = [
  ['#features', 'Features'],
  ['#how', 'How it works'],
  ['#templates', 'Templates'],
  ['#about', 'About'],
] as const;

/** Sticky header: transparent at the top, blurred card once the page scrolls. */
export function LandingHeader({ signedIn }: { signedIn: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const cta = signedIn ? (
    <Link
      href="/dashboard"
      className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
    >
      Open dashboard
    </Link>
  ) : (
    <>
      <Link
        href="/auth/login"
        className="text-muted-foreground hover:text-foreground px-3 py-2 text-sm font-medium transition-colors"
      >
        Sign in
      </Link>
      <Link
        href="/auth/register"
        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
      >
        Get started
      </Link>
    </>
  );

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-[background-color,box-shadow,border-color] duration-300',
        scrolled || open
          ? 'bg-background/80 border-b shadow-xs backdrop-blur-md'
          : 'border-b border-transparent'
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <span className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold">
            M
          </span>
          <span className="text-foreground font-bold">MockFlow</span>
        </Link>

        <nav className="hidden flex-1 items-center gap-1 md:flex" aria-label="Main">
          {NAV.map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md px-3 py-2 text-sm transition-colors"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="MockFlow on GitHub"
            className="text-muted-foreground hover:text-foreground hidden p-2 transition-colors sm:inline-flex"
          >
            <GithubIcon className="h-5 w-5" />
          </a>
          <ThemeToggle />
          <div className="hidden items-center gap-1 md:flex">{cta}</div>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground p-2 md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="animate-in fade-in slide-in-from-top-2 border-t px-4 pb-4 md:hidden">
          <nav className="flex flex-col py-2" aria-label="Mobile">
            {NAV.map(([href, label]) => (
              <a
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="text-foreground hover:bg-muted rounded-md px-2 py-2.5 text-sm"
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2 border-t pt-3">{cta}</div>
        </div>
      )}
    </header>
  );
}
