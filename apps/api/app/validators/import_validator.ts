import vine from '@vinejs/vine';

const parsedEndpointSchema = vine.object({
  method: vine.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const),
  path: vine.string().trim().startsWith('/'),
  statusCode: vine.number().min(100).max(599),
  responseBody: vine.any().nullable().optional(),
  responseHeaders: vine.record(vine.string()).optional(),
  delayMs: vine.number().min(0).max(5000).optional(),
  isActive: vine.boolean().optional(),
});

export const applyImportValidator = vine.compile(
  vine.object({
    endpoints: vine.array(parsedEndpointSchema),
    resolutions: vine.record(vine.enum(['skip', 'overwrite'] as const)).optional(),
  })
);
