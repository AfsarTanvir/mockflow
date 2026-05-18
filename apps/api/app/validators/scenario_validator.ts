import vine from '@vinejs/vine';

export const createScenarioValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(80),
    description: vine.string().trim().maxLength(500).optional(),
    statusCode: vine.number().min(100).max(599).optional(),
    responseBody: vine.any().optional(),
    responseHeaders: vine.record(vine.string()).optional(),
    delayMs: vine.number().min(0).max(5000).optional(),
    delayMaxMs: vine.number().min(0).max(5000).optional(),
    priority: vine.number().min(0).optional(),
  })
);

export const updateScenarioValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(80).optional(),
    description: vine.string().trim().maxLength(500).nullable().optional(),
    statusCode: vine.number().min(100).max(599).nullable().optional(),
    responseBody: vine.any().optional(),
    responseHeaders: vine.record(vine.string()).nullable().optional(),
    delayMs: vine.number().min(0).max(5000).nullable().optional(),
    delayMaxMs: vine.number().min(0).max(5000).nullable().optional(),
    priority: vine.number().min(0).optional(),
  })
);

const OVERRIDE_FIELDS = [
  'statusCode',
  'responseBody',
  'responseHeaders',
  'delayMs',
  'delayMaxMs',
] as const;

export function hasAtLeastOneOverride(data: Record<string, unknown>): boolean {
  return OVERRIDE_FIELDS.some((f) => data[f] !== undefined && data[f] !== null);
}

export function validateDelayRange(
  delayMs: number | null | undefined,
  delayMaxMs: number | null | undefined
): string | null {
  if (delayMs != null && delayMaxMs != null && delayMaxMs < delayMs) {
    return 'delayMaxMs must be greater than or equal to delayMs';
  }
  return null;
}
