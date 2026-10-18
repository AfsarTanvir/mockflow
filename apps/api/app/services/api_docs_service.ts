import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import app from '@adonisjs/core/services/app';
import router from '@adonisjs/core/services/router';
import openapi from '@foadonis/openapi/services/main';

/**
 * The OpenAPI document behind /api/docs, generated, never written by hand.
 *
 * @foadonis/openapi lists every route (path, method, path params, tag from the
 * controller). On top of that, each operation gets, from the route itself:
 *   - security: the bearer lock when the route uses the `auth` middleware;
 *   - summary: from the handler name (store → "Create", verifyEmail → "Verify email");
 *   - request body / query params: the JSON Schema of the VineJS validator the
 *     handler passes to request.validateUsing(), found in the controller source.
 * So a new route or validator shows up in the docs with no extra work.
 */

type JsonSchema = { properties?: Record<string, unknown>; required?: string[] } & Record<
  string,
  unknown
>;
type Operation = Record<string, unknown> & { parameters?: unknown[] };
type RouteJSON = {
  pattern: string;
  methods: string[];
  middleware: { all(): Set<{ name?: string }> };
  handler: { method?: string; importExpression?: string | null; name?: string } | Function;
};

const VERBS: Record<string, string> = {
  index: 'List',
  store: 'Create',
  show: 'Get',
  update: 'Update',
  destroy: 'Delete',
};

let cached: unknown = null;

function summary(method: string, tag?: string): string {
  const noun = tag ? ` ${tag.toLowerCase()}` : '';
  if (VERBS[method]) return `${VERBS[method]}${noun}`;
  const words = method.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** `/api/x/:id/:opt?` → `/api/x/{id}/{opt}`, as @foadonis/openapi writes paths. */
function toOpenApiPath(pattern: string): string {
  return pattern.replace(/:(\w+)\??/g, '{$1}');
}

/** Controller source (ts in dev, js in the build) from the route's lazy import. */
function controllerSource(importExpression: string): string | null {
  const rel = importExpression.match(/import\(['"](.+?)['"]\)/)?.[1];
  if (!rel) return null;
  const base = fileURLToPath(new URL(rel, new URL('start/', app.appRoot)));
  for (const file of [base, base.replace(/\.js$/, '.ts')]) {
    if (existsSync(file)) return readFileSync(file, 'utf8');
  }
  return null;
}

/** The validator a handler validates with, imported from '#validators/…'. */
async function validatorSchema(source: string, method: string): Promise<JsonSchema | null> {
  const start = source.search(new RegExp(`\\basync\\s+${method}\\s*\\(`));
  if (start < 0) return null;
  const rest = source.slice(start + 1);
  const end = rest.search(/\n {2}(?:async\s+\w+\s*\(|\/\*\*|\})/);
  const body = end < 0 ? rest : rest.slice(0, end);
  const name = body.match(/validateUsing\(\s*(\w+)/)?.[1];
  if (!name) return null;
  const from = source.match(
    new RegExp(`import\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*['"](#validators/[^'"]+)['"]`)
  )?.[1];
  if (!from) return null;
  const mod = (await import(from)) as Record<string, { toJSONSchema?: () => JsonSchema }>;
  return mod[name]?.toJSONSchema?.() ?? null;
}

export async function buildDocument(): Promise<unknown> {
  if (cached && app.inProduction) return cached;

  const doc = structuredClone(await openapi.buildDocument()) as unknown as {
    paths: Record<string, Record<string, Operation>>;
  };
  const routes = Object.values(router.toJSON()).flat() as unknown as RouteJSON[];

  for (const route of routes) {
    const ops = doc.paths[toOpenApiPath(route.pattern)];
    if (!ops) continue;
    const handler = typeof route.handler === 'function' ? null : route.handler;
    const needsAuth = [...route.middleware.all()].some((m) => m.name === 'auth');
    const source = handler?.importExpression ? controllerSource(handler.importExpression) : null;

    for (const verb of route.methods) {
      const op = ops[verb.toLowerCase()];
      if (!op) continue;
      const tag = (op.tags as string[] | undefined)?.[0];
      if (handler?.method) op.summary ??= summary(handler.method, tag);
      if (needsAuth) op.security = [{ bearer: [] }];

      const schema =
        source && handler?.method ? await validatorSchema(source, handler.method) : null;
      if (!schema) continue;
      if (verb === 'GET' || verb === 'HEAD') {
        const required = new Set(schema.required ?? []);
        op.parameters = [
          ...(op.parameters ?? []),
          ...Object.entries(schema.properties ?? {}).map(([name, s]) => ({
            name,
            in: 'query',
            required: required.has(name),
            schema: s,
          })),
        ];
      } else {
        op.requestBody = { required: true, content: { 'application/json': { schema } } };
      }
    }
  }

  cached = doc;
  return doc;
}
