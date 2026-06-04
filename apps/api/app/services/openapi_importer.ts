const OPERATION_KEYS = ['get', 'post', 'put', 'patch', 'delete'] as const;

export interface ParsedEndpoint {
  method: string;
  path: string;
  statusCode: number;
  responseBody: Record<string, unknown> | null;
  responseHeaders: Record<string, string>;
  delayMs: number;
  isActive: boolean;
}

export interface ParseResult {
  endpoints: ParsedEndpoint[];
  warnings: string[];
}

function openApiToColon(path: string): string {
  return path.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)}/g, ':$1');
}

function first2xxCode(responses: Record<string, unknown>): string {
  const found = Object.keys(responses).find((c) => Number(c) >= 200 && Number(c) < 300);
  return found ?? '200';
}

function parseResponseHeaders(headersObj: unknown): Record<string, string> {
  if (!headersObj || typeof headersObj !== 'object') return {};
  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(headersObj as Record<string, unknown>)) {
    if (val && typeof val === 'object' && 'example' in val) {
      const ex = (val as Record<string, unknown>)['example'];
      if (typeof ex === 'string') result[key] = ex;
    }
  }
  return result;
}

export function parseOpenApiSpec(raw: unknown): ParseResult | { error: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { error: 'File must be a JSON object' };
  }

  const spec = raw as Record<string, unknown>;

  if (typeof spec['openapi'] !== 'string' || !spec['openapi'].startsWith('3.')) {
    return {
      error:
        'Only OpenAPI 3.x specs are supported. Ensure your file has an "openapi" field starting with "3."',
    };
  }

  if (!spec['paths'] || typeof spec['paths'] !== 'object' || Array.isArray(spec['paths'])) {
    return { error: 'Spec must contain a "paths" object' };
  }

  const paths = spec['paths'] as Record<string, unknown>;
  const endpoints: ParsedEndpoint[] = [];
  const warnings: string[] = [];

  for (const [pathKey, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;

    const path = openApiToColon(pathKey);
    const item = pathItem as Record<string, unknown>;

    for (const opKey of OPERATION_KEYS) {
      const operation = item[opKey];
      if (!operation || typeof operation !== 'object') continue;

      const op = operation as Record<string, unknown>;
      const label = `${opKey.toUpperCase()} ${path}`;

      const responses = op['responses'] as Record<string, unknown> | undefined;

      if (!responses || typeof responses !== 'object') {
        endpoints.push({
          method: opKey.toUpperCase(),
          path,
          statusCode: 200,
          responseBody: null,
          responseHeaders: {},
          delayMs: 0,
          isActive: true,
        });
        continue;
      }

      const code = first2xxCode(responses);
      const statusCode = Number(code) || 200;
      const responseData = responses[code] as Record<string, unknown> | undefined;

      let responseBody: Record<string, unknown> | null = null;
      let responseHeaders: Record<string, string> = {};

      if (responseData) {
        if ('$ref' in responseData) {
          warnings.push(`${label}: $ref not resolved — body set to null`);
        } else {
          const content = responseData['content'] as Record<string, unknown> | undefined;
          if (content) {
            const jsonContent = content['application/json'] as Record<string, unknown> | undefined;
            if (jsonContent && 'example' in jsonContent) {
              const example = jsonContent['example'];
              if (example === null || example === undefined) {
                responseBody = null;
              } else if (typeof example === 'object' && !Array.isArray(example)) {
                if ('$ref' in (example as Record<string, unknown>)) {
                  warnings.push(`${label}: $ref in example not resolved — body set to null`);
                } else {
                  responseBody = example as Record<string, unknown>;
                }
              } else {
                // Array or primitive — wrap it so responseBody stays as an object
                responseBody = { data: example };
              }
            }
          }
          responseHeaders = parseResponseHeaders(responseData['headers']);
        }
      }

      const delayMs = typeof op['x-mockflow-delay-ms'] === 'number' ? op['x-mockflow-delay-ms'] : 0;

      endpoints.push({
        method: opKey.toUpperCase(),
        path,
        statusCode,
        responseBody,
        responseHeaders,
        delayMs,
        isActive: true,
      });
    }
  }

  return { endpoints, warnings };
}
