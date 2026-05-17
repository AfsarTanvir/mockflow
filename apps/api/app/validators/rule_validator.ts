import vine from '@vinejs/vine';

export const createRuleValidator = vine.compile(
  vine.object({
    source: vine.enum(['header', 'query', 'body'] as const),
    field: vine.string().trim().minLength(1).maxLength(255),
    operator: vine.enum(['equals', 'exists'] as const),
    value: vine.string().nullable().optional(),
  })
);

export const updateRuleValidator = vine.compile(
  vine.object({
    source: vine.enum(['header', 'query', 'body'] as const).optional(),
    field: vine.string().trim().minLength(1).maxLength(255).optional(),
    operator: vine.enum(['equals', 'exists'] as const).optional(),
    value: vine.string().nullable().optional(),
  })
);

export function validateRuleCombination(
  operator: 'equals' | 'exists',
  value: string | null | undefined
): string | null {
  if (operator === 'equals' && (value === null || value === undefined || value === '')) {
    return 'value is required when operator is "equals"';
  }
  if (operator === 'exists' && value !== null && value !== undefined && value !== '') {
    return 'value must not be set when operator is "exists"';
  }
  return null;
}
