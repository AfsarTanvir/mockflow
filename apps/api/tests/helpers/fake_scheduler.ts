import { createServer, type IncomingMessage, type Server } from 'node:http';
import { randomBytes } from 'node:crypto';
import type { AddressInfo } from 'node:net';

/**
 * An in-memory stand-in for local-scheduler's HTTP API (same routes, status
 * codes and error shape), so specs never touch a real scheduler. Jobs never run
 * on their own; tests inspect `jobs` and `requests` instead.
 */

export interface FakeJob {
  id: string;
  name: string;
  schedule?: string;
  runAt?: string;
  type: string;
  http: { url: string; method?: string; headers?: Record<string, string>; body?: string };
  timeoutSeconds?: number;
  enabled: boolean;
  running: boolean;
  nextRunAt?: string;
  createdAt: string;
}

export class FakeScheduler {
  jobs = new Map<string, FakeJob>();
  requests: { method: string; path: string }[] = [];
  /** When set, /jobs routes require `Authorization: Bearer <apiKey>`. */
  apiKey: string | null = null;
  /** Answer the next N requests with 500 — a blip. The availability probe is never affected. */
  failNext = 0;
  private server: Server | null = null;

  get url(): string {
    const { port } = this.server!.address() as AddressInfo;
    return `http://127.0.0.1:${port}`;
  }

  async start(): Promise<this> {
    this.server = createServer((req, res) => {
      void this.handle(req).then(({ status, body }) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(body === undefined ? '' : JSON.stringify(body));
      });
    });
    await new Promise<void>((resolve) => this.server!.listen(0, '127.0.0.1', resolve));
    return this;
  }

  async stop(): Promise<void> {
    await new Promise<void>((resolve) => this.server?.close(() => resolve()) ?? resolve());
    this.server = null;
  }

  reset(): void {
    this.jobs.clear();
    this.requests = [];
    this.apiKey = null;
    this.failNext = 0;
  }

  /** Add a job directly (e.g. an orphan left behind by an earlier delete). */
  seed(job: Partial<FakeJob> & { name: string }): FakeJob {
    const full: FakeJob = {
      id: randomBytes(8).toString('hex'),
      type: 'http',
      http: { url: 'http://example.test/' },
      enabled: true,
      running: false,
      createdAt: new Date().toISOString(),
      ...job,
    };
    this.jobs.set(full.id, full);
    return full;
  }

  count(method: string, pathPrefix: string): number {
    return this.requests.filter((r) => r.method === method && r.path.startsWith(pathPrefix)).length;
  }

  private async handle(req: IncomingMessage): Promise<{ status: number; body?: unknown }> {
    const url = new URL(req.url ?? '/', 'http://fake');
    const method = req.method ?? 'GET';
    this.requests.push({ method, path: url.pathname });

    const error = (status: number, code: string) => ({
      status,
      body: { error: { code, message: code } },
    });

    if (url.pathname === '/health') return { status: 200, body: { status: 'ok' } };
    if (this.apiKey && req.headers.authorization !== `Bearer ${this.apiKey}`) {
      return error(401, 'unauthorized');
    }
    if (this.failNext > 0 && !url.pathname.endsWith('mockflow-availability-probe')) {
      this.failNext -= 1;
      return error(500, 'internal');
    }

    if (url.pathname === '/jobs') {
      if (method === 'GET') return { status: 200, body: [...this.jobs.values()] };
      if (method === 'POST') {
        const spec = JSON.parse(await readBody(req));
        const job: FakeJob = {
          ...spec,
          id: randomBytes(8).toString('hex'),
          enabled: true,
          running: false,
          nextRunAt: spec.runAt ?? new Date(Date.now() + 60_000).toISOString(),
          createdAt: new Date().toISOString(),
        };
        this.jobs.set(job.id, job);
        return { status: 201, body: job };
      }
    }

    const m = url.pathname.match(/^\/jobs\/([^/]+)(?:\/(runs|run|pause|resume))?$/);
    if (!m) return error(404, 'not_found');
    const job = this.jobs.get(decodeURIComponent(m[1]!));
    if (!job) return error(404, 'not_found');
    const action = m[2];

    if (!action && method === 'GET') return { status: 200, body: job };
    if (!action && method === 'DELETE') {
      this.jobs.delete(job.id);
      return { status: 204 };
    }
    if (action === 'runs' && method === 'GET') {
      return {
        status: 200,
        body: [{ id: 1, startedAt: job.createdAt, status: 'success', output: '200 OK' }],
      };
    }
    if (action === 'pause') job.enabled = false;
    if (action === 'resume') job.enabled = true;
    if (action === 'run' && job.running) return error(409, 'already_running');
    return { status: action === 'run' ? 202 : 200, body: job };
  }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

/** Poll until `check` passes (for fire-and-forget scheduler calls). */
export async function eventually(check: () => boolean, timeoutMs = 2000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (check()) return true;
    await new Promise((r) => setTimeout(r, 20));
  }
  return check();
}
