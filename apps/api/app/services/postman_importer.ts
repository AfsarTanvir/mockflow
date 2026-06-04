import type { ParsedEndpoint, ParseResult } from './openapi_importer.js';

interface PostmanItem {
  name?: string;
  request?: unknown;
  response?: unknown[];
  item?: PostmanItem[];
}

function stripBaseUrl(raw: string): string {
  // Remove {{baseUrl}} or {{anyVar}} prefix, keep the path
  return raw.replace(/^\{\{[^}]+\}\}/, '').replace(/\{\{([^}]+)\}\}/g, ':$1') || '/';
}

function ensureLeadingSlash(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

function parseUrlRaw(urlRaw: unknown): string {
  if (typeof urlRaw === 'string') {
    return ensureLeadingSlash(stripBaseUrl(urlRaw));
  }
  if (urlRaw && typeof urlRaw === 'object') {
    const urlObj = urlRaw as Record<string, unknown>;
    if (typeof urlObj['raw'] === 'string') {
      return ensureLeadingSlash(stripBaseUrl(urlObj['raw']));
    }
    // Reconstruct from path array
    if (Array.isArray(urlObj['path'])) {
      const segments = urlObj['path'].map((s: unknown) =>
        typeof s === 'string' ? s.replace(/^:(.+)$/, ':$1') : ''
      );
      return '/' + segments.join('/');
    }
  }
  return '/';
}

function parseBody(body: unknown): Record<string, unknown> | null {
  if (body === null || body === undefined || body === '') return null;
  if (typeof body === 'object' && !Array.isArray(body)) return body as Record<string, unknown>;
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body);
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      // Array or primitive
      return { data: parsed };
    } catch {
      return { raw: body };
    }
  }
  return null;
}

function parseHeaders(headerArr: unknown): Record<string, string> {
  if (!Array.isArray(headerArr)) return {};
  const result: Record<string, string> = {};
  for (const h of headerArr) {
    if (h && typeof h === 'object') {
      const header = h as Record<string, unknown>;
      if (typeof header['key'] === 'string' && typeof header['value'] === 'string') {
        result[header['key']] = header['value'];
      }
    }
  }
  return result;
}

function processLeaf(item: PostmanItem, warnings: string[]): ParsedEndpoint | null {
  const req = item.request;
  if (!req || typeof req !== 'object') return null;

  const request = req as Record<string, unknown>;
  const method = typeof request['method'] === 'string' ? request['method'].toUpperCase() : 'GET';
  const path = parseUrlRaw(request['url']);

  const responses = item.response ?? [];
  const firstResponse = responses[0] as Record<string, unknown> | undefined;

  let statusCode = 200;
  let responseBody: Record<string, unknown> | null = null;
  let responseHeaders: Record<string, string> = {};

  if (firstResponse) {
    if (typeof firstResponse['code'] === 'number') {
      statusCode = firstResponse['code'];
    } else if (typeof firstResponse['status'] === 'string') {
      const parsed = Number(firstResponse['status']);
      if (!Number.isNaN(parsed)) statusCode = parsed;
    }
    responseBody = parseBody(firstResponse['body']);
    responseHeaders = parseHeaders(firstResponse['header']);
  }

  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    warnings.push(`Skipped unsupported method ${method} ${path}`);
    return null;
  }

  return { method, path, statusCode, responseBody, responseHeaders, delayMs: 0, isActive: true };
}

function walkItems(items: PostmanItem[], endpoints: ParsedEndpoint[], warnings: string[]): void {
  for (const item of items) {
    if (Array.isArray(item.item)) {
      // folder — recurse
      walkItems(item.item, endpoints, warnings);
    } else {
      const ep = processLeaf(item, warnings);
      if (ep) endpoints.push(ep);
    }
  }
}

export function parsePostmanCollection(raw: unknown): ParseResult | { error: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { error: 'File must be a JSON object' };
  }

  const col = raw as Record<string, unknown>;
  const info = col['info'] as Record<string, unknown> | undefined;

  if (!info || typeof info['schema'] !== 'string' || !info['schema'].includes('v2.1.0')) {
    return {
      error:
        'Only Postman Collection v2.1.0 is supported. Ensure your file has an info.schema containing "v2.1.0".',
    };
  }

  if (!Array.isArray(col['item'])) {
    return { error: 'Collection must have an "item" array' };
  }

  const endpoints: ParsedEndpoint[] = [];
  const warnings: string[] = [];

  walkItems(col['item'] as PostmanItem[], endpoints, warnings);

  return { endpoints, warnings };
}
