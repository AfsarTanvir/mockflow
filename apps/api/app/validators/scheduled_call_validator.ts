import vine from '@vinejs/vine';
import { MAX_INTERVAL_SECONDS, MIN_INTERVAL_SECONDS } from '#services/scheduled_call_service';

/**
 * Field names avoid `headers`, `params` and `cookies`: AdonisJS merges the HTTP
 * request's own headers/params/cookies into the data `validateUsing` checks.
 *
 * Shape only. Cross-field rules (runAt in the future, path matches the endpoint,
 * reserved headers, no body on GET) live in scheduled_call_service.
 */
export const createScheduledCallValidator = vine.compile(
  vine.object({
    endpointId: vine.string().uuid(),
    // A concrete path on the endpoint: params filled in, optional ?query. No spaces or #.
    path: vine
      .string()
      .trim()
      .maxLength(500)
      .regex(/^\/[^\s#]*$/),
    requestHeaders: vine.record(vine.string().maxLength(1000)).optional(),
    requestBody: vine.string().maxLength(10_000).optional(),
    mode: vine.enum(['once', 'repeat'] as const),
    runAt: vine.string().optional(),
    intervalSeconds: vine
      .number()
      .withoutDecimals()
      .min(MIN_INTERVAL_SECONDS)
      .max(MAX_INTERVAL_SECONDS)
      .optional(),
  })
);
