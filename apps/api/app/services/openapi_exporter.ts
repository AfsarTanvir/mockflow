import { evaluateBody } from './faker_evaluator.js';

interface ProjectData {
  id: string;
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

function colonToOpenApi(path: string): string {
  return path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '{$1}');
}

function extractPathParams(path: string): string[] {
  const matches = path.match(/\{([a-zA-Z_][a-zA-Z0-9_]*)}/g) ?? [];
  return matches.map((m) => m.slice(1, -1));
}

function headersToOpenApi(headers: Record<string, string>) {
  const result: Record<string, unknown> = {};
  for (const [name, description] of Object.entries(headers)) {
    result[name] = { schema: { type: 'string' }, example: description };
  }
  return result;
}

export function buildOpenApiDoc(
  project: ProjectData,
  endpoints: EndpointData[],
  apiUrl: string,
  evaluate: boolean
): Record<string, unknown> {
  const active = endpoints.filter((e) => e.isActive);

  const paths: Record<string, unknown> = {};

  for (const ep of active) {
    const openApiPath = colonToOpenApi(ep.path);
    const method = ep.method.toLowerCase();
    const pathParams = extractPathParams(openApiPath);

    const responseBody = evaluate
      ? (evaluateBody(ep.responseBody, {}) as Record<string, unknown> | null)
      : ep.responseBody;

    const responseObject: Record<string, unknown> = {
      description: `${ep.statusCode} response`,
    };

    if (responseBody !== null) {
      responseObject['content'] = {
        'application/json': {
          example: responseBody,
        },
      };
    }

    if (Object.keys(ep.responseHeaders).length > 0) {
      responseObject['headers'] = headersToOpenApi(ep.responseHeaders);
    }

    const operation: Record<string, unknown> = {
      responses: {
        [String(ep.statusCode)]: responseObject,
      },
      'x-mockflow-delay-ms': ep.delayMs,
    };

    if (pathParams.length > 0) {
      operation['parameters'] = pathParams.map((name) => ({
        in: 'path',
        name,
        required: true,
        schema: { type: 'string' },
      }));
    }

    if (!paths[openApiPath]) {
      paths[openApiPath] = {};
    }

    (paths[openApiPath] as Record<string, unknown>)[method] = operation;
  }

  const serverUrl = `${apiUrl}/mock/${project.slug}${project.basePath === '/' ? '' : project.basePath}`;

  return {
    openapi: '3.0.3',
    info: {
      title: project.name,
      version: '1.0.0',
      'x-mockflow-project-id': project.id,
    },
    servers: [{ url: serverUrl }],
    paths,
  };
}
