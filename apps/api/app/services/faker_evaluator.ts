import { faker } from '@faker-js/faker';

/**
 * Matches {{faker.category.method}} or {{faker.category.method(args)}}
 * Args are optional and may be a JSON object/array or comma-separated primitives.
 */
const FAKER_RE = /\{\{faker\.([a-zA-Z]+)\.([a-zA-Z]+)(?:\(([^)]*)\))?\}\}/g;

/**
 * Matches {{param.name}} for path parameter substitution.
 */
const PARAM_RE = /\{\{param\.(\w+)\}\}/g;

function parseFakerArgs(raw: string): unknown[] {
  const s = raw.trim();
  if (!s) return [];
  // JSON object or array
  if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) {
    try {
      return [JSON.parse(s)];
    } catch {
      return [];
    }
  }
  // Comma-separated primitives (numbers, booleans, quoted strings)
  return s.split(',').map((token) => {
    const t = token.trim().replace(/^['"]|['"]$/g, '');
    if (t === 'true') return true;
    if (t === 'false') return false;
    const n = Number(t);
    return Number.isNaN(n) ? t : n;
  });
}

function callFaker(category: string, method: string, args: unknown[]): string {
  try {
    const cat = (faker as unknown as Record<string, unknown>)[category];
    if (!cat || typeof cat !== 'object') return `{{faker.${category}.${method}}}`;
    const fn = (cat as Record<string, unknown>)[method];
    if (typeof fn !== 'function') return `{{faker.${category}.${method}}}`;
    const result = (fn as Function).apply(cat, args);
    if (result === null || result === undefined) return '';
    if (typeof result === 'object') return JSON.stringify(result);
    return String(result);
  } catch {
    return `{{faker.${category}.${method}}}`;
  }
}

function evaluateString(str: string, pathParams: Record<string, string>): string {
  return str
    .replace(PARAM_RE, (_, key) => pathParams[key] ?? `{{param.${key}}}`)
    .replace(FAKER_RE, (_, category, method, rawArgs = '') => {
      const args = parseFakerArgs(rawArgs);
      return callFaker(category, method, args);
    });
}

function walkValue(value: unknown, pathParams: Record<string, string>): unknown {
  if (typeof value === 'string') return evaluateString(value, pathParams);
  if (Array.isArray(value)) return value.map((v) => walkValue(v, pathParams));
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = walkValue(v, pathParams);
    }
    return out;
  }
  return value;
}

/**
 * Recursively walks a response body and evaluates all template expressions.
 *
 * Supported templates:
 *   {{faker.person.fullName}}          — no-arg faker call
 *   {{faker.number.int({"min":1,"max":100})}}  — faker call with JSON args
 *   {{param.id}}                       — injected path parameter
 *
 * Non-string values (numbers, booleans, null) pass through unchanged.
 * Invalid faker calls fall back to the original template string.
 */
export function evaluateBody(
  body: Record<string, unknown> | null,
  pathParams: Record<string, string>
): unknown {
  if (body === null) return null;
  return walkValue(body, pathParams);
}
