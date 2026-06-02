import { evaluateBody } from './faker_evaluator.js';

interface ProjectData {
  name: string;
  slug: string;
  basePath: string;
}

interface EndpointData {
  method: string;
  path: string;
  statusCode: number;
  responseBody: Record<string, unknown> | null;
  responseHeaders: Record<string, string>;
  delayMs: number;
  isActive: boolean;
}

const METHOD_ORDER = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

function colonToDoublebraces(path: string): string {
  return path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, ':$1');
}

function headersToPostman(headers: Record<string, string>) {
  return Object.entries(headers).map(([key, value]) => ({ key, value }));
}

export function buildPostmanCollection(
  project: ProjectData,
  endpoints: EndpointData[],
  apiUrl: string,
  evaluate: boolean
): Record<string, unknown> {
  const active = endpoints.filter((e) => e.isActive);

  const sorted = [...active].sort((a, b) => {
    const pathCmp = a.path.localeCompare(b.path);
    if (pathCmp !== 0) return pathCmp;
    return METHOD_ORDER.indexOf(a.method) - METHOD_ORDER.indexOf(b.method);
  });

  const baseUrl = `${apiUrl}/mock/${project.slug}${project.basePath === '/' ? '' : project.basePath}`;

  const items = sorted.map((ep) => {
    const responseBody = evaluate
      ? (evaluateBody(ep.responseBody, {}) as Record<string, unknown> | null)
      : ep.responseBody;

    const pathSegment = colonToDoublebraces(ep.path);
    const rawUrl = `{{baseUrl}}${pathSegment}`;
    const urlParts = pathSegment.replace(/^\//, '').split('/');

    const response =
      ep.statusCode || responseBody !== null
        ? [
            {
              name: 'Default response',
              status: String(ep.statusCode),
              code: ep.statusCode,
              body: responseBody !== null ? JSON.stringify(responseBody, null, 2) : '',
              header: headersToPostman(ep.responseHeaders),
            },
          ]
        : [];

    return {
      name: `${ep.method} ${ep.path}`,
      request: {
        method: ep.method,
        header: [],
        url: {
          raw: rawUrl,
          host: ['{{baseUrl}}'],
          path: urlParts,
        },
      },
      response,
    };
  });

  return {
    info: {
      name: project.name,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    variable: [{ key: 'baseUrl', value: baseUrl, type: 'string' }],
    item: items,
  };
}
