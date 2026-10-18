import Link from 'next/link';
import { ArrowUp, Mail } from 'lucide-react';
import { ApiStatus } from './api-status';
import { GithubIcon } from './github-icon';
import { AUTHOR, REPO_URL, SCHEDULER_REPO_URL } from './about';

const STACK = ['AdonisJS 7', 'Next.js 16', 'React 19', 'PostgreSQL', 'Redis', 'Tailwind CSS 4'];

const linkClass = 'text-muted-foreground hover:text-foreground text-sm transition-colors';

export function LandingFooter({ signedIn }: { signedIn: boolean }) {
  const columns: { title: string; links: [string, string, boolean?][] }[] = [
    {
      title: 'Product',
      links: [
        ['#features', 'Features'],
        ['#how', 'How it works'],
        ['#templates', 'Faker templates'],
        signedIn ? ['/dashboard', 'Dashboard'] : ['/auth/register', 'Create an account'],
      ],
    },
    {
      title: 'Open source',
      links: [
        [REPO_URL, 'MockFlow on GitHub', true],
        [SCHEDULER_REPO_URL, 'local-scheduler', true],
        [`${REPO_URL}/issues`, 'Report an issue', true],
      ],
    },
  ];

  return (
    <footer className="bg-muted/30 border-t">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1.4fr]">
        <div className="space-y-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold">
              M
            </span>
            <span className="text-foreground font-bold">MockFlow</span>
          </Link>
          <p className="text-muted-foreground max-w-xs text-sm">
            Collaborative API mocks with live URLs, realistic fake data, scenarios and version
            history.
          </p>
          <ApiStatus />
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <h3 className="text-foreground mb-3 text-sm font-semibold">{col.title}</h3>
            <ul className="space-y-2">
              {col.links.map(([href, label, external]) => (
                <li key={label}>
                  {external ? (
                    <a href={href} target="_blank" rel="noreferrer" className={linkClass}>
                      {label}
                    </a>
                  ) : (
                    <Link href={href} className={linkClass}>
                      {label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <h3 className="text-foreground mb-3 text-sm font-semibold">Made by</h3>
          <div className="flex items-center gap-3">
            <span className="animate-gradient-x flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(120deg,var(--primary),var(--method-post),var(--primary))] bg-[length:200%_200%] text-sm font-bold text-white">
              {AUTHOR.initials}
            </span>
            <div className="min-w-0">
              <p className="text-foreground text-sm font-medium">{AUTHOR.name}</p>
              <p className="text-muted-foreground truncate text-xs">{AUTHOR.role}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {AUTHOR.github.map((g) => (
              <a
                key={g.handle}
                href={g.url}
                target="_blank"
                rel="noreferrer"
                className="hover:border-primary/50 hover:text-foreground text-muted-foreground inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors"
              >
                <GithubIcon className="h-3.5 w-3.5" />
                {g.handle}
              </a>
            ))}
            <a
              href={`mailto:${AUTHOR.email}`}
              className="hover:border-primary/50 hover:text-foreground text-muted-foreground inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors"
            >
              <Mail className="h-3.5 w-3.5" />
              Email
            </a>
          </div>
        </div>
      </div>

      <div className="border-t">
        <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 text-xs sm:flex-row sm:items-center sm:px-6">
          <p>
            © {new Date().getFullYear()} {AUTHOR.name}. Built with {STACK.slice(0, -1).join(', ')}{' '}
            and {STACK.at(-1)}.
          </p>
          <a
            href="#top"
            className="hover:text-foreground inline-flex items-center gap-1 sm:ml-auto"
          >
            <ArrowUp className="h-3.5 w-3.5" />
            Back to top
          </a>
        </div>
      </div>
    </footer>
  );
}
