import Link from 'next/link';
import { cookies } from 'next/headers';
import {
  ArrowRight,
  Clock,
  Download,
  FileClock,
  GitBranch,
  ListChecks,
  ScrollText,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { LandingHeader } from '@/components/landing/landing-header';
import { LandingFooter } from '@/components/landing/landing-footer';
import { Reveal } from '@/components/landing/reveal';
import { GithubIcon } from '@/components/landing/github-icon';
import { AUTHOR, REPO_URL } from '@/components/landing/about';

const FEATURES = [
  {
    icon: Zap,
    title: 'Live mock URLs',
    text: 'Define a method, path and response; it answers at /mock/<project>/… right away.',
  },
  {
    icon: Sparkles,
    title: 'Realistic fake data',
    text: '{{faker.*}} and {{param.*}} templates return fresh names, emails, ids and dates on every call.',
  },
  {
    icon: GitBranch,
    title: 'Scenarios & rules',
    text: 'Return a 401 for a wrong password or a 503 during "maintenance", picked by request rules.',
  },
  {
    icon: FileClock,
    title: 'Version history',
    text: 'Snapshot a project and restore any earlier version in one atomic step.',
  },
  {
    icon: Users,
    title: 'Teams & companies',
    text: 'Projects belong to you, a team or a company, with owner, admin, member and viewer roles.',
  },
  {
    icon: Clock,
    title: 'Scheduled calls',
    text: 'Call an endpoint at a set time or on repeat through the optional local-scheduler.',
  },
  {
    icon: ScrollText,
    title: 'Request logs',
    text: 'See every hit on your mocks: method, path, status and response time.',
  },
  {
    icon: Download,
    title: 'Import & export',
    text: 'Bring endpoints in from OpenAPI 3 or Postman v2.1, and export them back out.',
  },
];

const STEPS = [
  ['Create a project', 'Give it a name and an optional base path such as /v1.'],
  [
    'Add endpoints',
    'Pick a method and path, set the status, delay and a JSON body with templates.',
  ],
  ['Call the mock', 'Point your frontend or tests at the live URL while the real API is built.'],
];

const TEMPLATE = `{
  "id": "{{param.id}}",
  "name": "{{faker.person.fullName}}",
  "email": "{{faker.internet.email}}",
  "joined": "{{faker.date.past}}"
}`;

const OUTPUT = `{
  "id": "42",
  "name": "Maya Rahman",
  "email": "maya.rahman@example.com",
  "joined": "2025-11-03T09:14:27.000Z"
}`;

function Code({ children, className = '' }: { children: string; className?: string }) {
  return (
    <pre
      className={`bg-background/60 overflow-x-auto rounded-lg border p-4 font-mono text-xs leading-relaxed sm:text-sm ${className}`}
    >
      {children}
    </pre>
  );
}

export default async function Home() {
  const signedIn = !!(await cookies()).get('token')?.value;

  return (
    <div id="top" className="bg-background text-foreground min-h-screen">
      <LandingHeader signedIn={signedIn} />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
            <div className="animate-float bg-primary/20 absolute -top-24 -left-24 h-80 w-80 rounded-full blur-3xl" />
            <div className="animate-float bg-method-post/20 absolute top-40 -right-24 h-72 w-72 rounded-full blur-3xl [animation-delay:-3s]" />
          </div>

          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-2">
            <div>
              <p className="animate-fade-up bg-muted text-muted-foreground mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
                <span className="bg-success h-1.5 w-1.5 rounded-full" />
                Collaborative API mock server
              </p>
              <h1 className="animate-fade-up text-4xl font-bold tracking-tight [animation-delay:80ms] sm:text-5xl">
                Build the frontend{' '}
                <span className="animate-gradient-x bg-[linear-gradient(90deg,var(--primary),var(--method-post),var(--primary))] bg-[length:200%_auto] bg-clip-text text-transparent">
                  before the backend exists
                </span>
              </h1>
              <p className="animate-fade-up text-muted-foreground mt-5 max-w-xl text-base [animation-delay:160ms] sm:text-lg">
                MockFlow turns an API contract into live mock endpoints in seconds, with realistic
                fake data, conditional scenarios and a full history of every change.
              </p>
              <div className="animate-fade-up mt-8 flex flex-wrap gap-3 [animation-delay:240ms]">
                <Link
                  href={signedIn ? '/dashboard' : '/auth/register'}
                  className="group bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
                >
                  {signedIn ? 'Open dashboard' : 'Start mocking, free'}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <a
                  href={REPO_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:bg-muted inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors"
                >
                  <GithubIcon className="h-4 w-4" />
                  View source
                </a>
              </div>
            </div>

            {/* Request → response window */}
            <div className="animate-fade-up [animation-delay:320ms]">
              <div className="bg-card overflow-hidden rounded-xl border shadow-xl">
                <div className="flex items-center gap-1.5 border-b px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                  <span className="text-muted-foreground ml-3 font-mono text-xs">terminal</span>
                </div>
                <div className="space-y-3 p-4 font-mono text-xs sm:text-sm">
                  <p>
                    <span className="text-method-post">$</span> curl
                    localhost:3333/mock/shop/v1/users/42
                    <span className="animate-blink bg-foreground ml-0.5 inline-block h-4 w-2 align-middle" />
                  </p>
                  <p className="text-success">HTTP/1.1 200 OK · 38 ms</p>
                  <pre className="text-muted-foreground whitespace-pre-wrap">{OUTPUT}</pre>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
          <Reveal className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">Everything a mock API needs</h2>
            <p className="text-muted-foreground mt-3">
              From a single fake endpoint to a whole team&apos;s contract, kept in one place.
            </p>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={(i % 4) * 80}>
                <div className="group bg-card hover:border-primary/40 h-full rounded-xl border p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <span className="bg-primary/10 text-primary mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110">
                    <f.icon className="h-5 w-5" />
                  </span>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="text-muted-foreground mt-1.5 text-sm">{f.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="bg-muted/30 scroll-mt-20 border-y">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <Reveal className="mb-12 text-center">
              <h2 className="text-3xl font-bold tracking-tight">Three steps to a live mock</h2>
            </Reveal>
            <ol className="grid gap-6 md:grid-cols-3">
              {STEPS.map(([title, text], i) => (
                <Reveal key={title} delay={i * 120}>
                  <li className="bg-card relative h-full rounded-xl border p-6">
                    <span className="bg-primary text-primary-foreground mb-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold">
                      {i + 1}
                    </span>
                    <h3 className="font-semibold">{title}</h3>
                    <p className="text-muted-foreground mt-1.5 text-sm">{text}</p>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* Templates */}
        <section id="templates" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
          <Reveal className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">Write a template, get real data</h2>
            <p className="text-muted-foreground mt-3">
              Each request fills the placeholders again, so lists and forms look real.
            </p>
          </Reveal>
          <div className="grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
            <Reveal>
              <p className="text-muted-foreground mb-2 text-xs font-medium">Response body</p>
              <Code>{TEMPLATE}</Code>
            </Reveal>
            <ArrowRight className="text-primary mx-auto h-6 w-6 rotate-90 md:rotate-0" />
            <Reveal delay={150}>
              <p className="text-muted-foreground mb-2 text-xs font-medium">
                GET /users/42 returns
              </p>
              <Code className="border-primary/30">{OUTPUT}</Code>
            </Reveal>
          </div>
        </section>

        {/* About */}
        <section id="about" className="bg-muted/30 scroll-mt-20 border-y">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 sm:px-6 md:grid-cols-[auto_1fr]">
            <Reveal>
              <span className="animate-gradient-x mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-[linear-gradient(120deg,var(--primary),var(--method-post),var(--primary))] bg-[length:200%_200%] text-3xl font-bold text-white shadow-lg">
                {AUTHOR.initials}
              </span>
            </Reveal>
            <Reveal delay={120}>
              <p className="text-primary text-sm font-medium">About the author</p>
              <h2 className="mt-1 text-3xl font-bold tracking-tight">{AUTHOR.name}</h2>
              <p className="text-muted-foreground mt-1 text-sm">{AUTHOR.role}</p>
              <p className="text-muted-foreground mt-4 max-w-2xl">
                MockFlow started from a familiar problem: the frontend waiting for the backend. It
                is built end to end with an AdonisJS API, a Next.js dashboard, PostgreSQL and Redis,
                plus a small Go scheduler for timed calls.
              </p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {AUTHOR.github.map((g) => (
                  <li key={g.handle}>
                    <a
                      href={g.url}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:border-primary/50 bg-card inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors"
                    >
                      <GithubIcon className="h-4 w-4" />@{g.handle}
                    </a>
                  </li>
                ))}
                <li>
                  <a
                    href={`mailto:${AUTHOR.email}`}
                    className="hover:border-primary/50 bg-card inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors"
                  >
                    {AUTHOR.email}
                  </a>
                </li>
              </ul>
            </Reveal>
          </div>
        </section>

        {/* Call to action */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <Reveal>
            <div className="bg-primary text-primary-foreground relative overflow-hidden rounded-2xl px-6 py-12 text-center sm:px-12">
              <div
                aria-hidden
                className="animate-float absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10 blur-2xl"
              />
              <ListChecks className="mx-auto mb-4 h-8 w-8 opacity-80" />
              <h2 className="text-2xl font-bold sm:text-3xl">Ready when your frontend is</h2>
              <p className="mx-auto mt-3 max-w-xl opacity-90">
                Create a project, add an endpoint and call it, all within a minute.
              </p>
              <Link
                href={signedIn ? '/dashboard' : '/auth/register'}
                className="bg-background text-foreground mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-transform hover:scale-[1.03] active:scale-[0.98]"
              >
                {signedIn ? 'Go to your projects' : 'Create a free account'}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <LandingFooter signedIn={signedIn} />
    </div>
  );
}
