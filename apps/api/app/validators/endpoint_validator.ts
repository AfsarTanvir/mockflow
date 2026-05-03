import vine from '@vinejs/vine';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

export const createEndpointValidator = vine.compile(
  vine.object({
    method: vine.enum(HTTP_METHODS),
    path: vine.string().trim().startsWith('/').maxLength(500),
    statusCode: vine.number().min(100).max(599).optional(),
    responseBody: vine.any().optional(),
    responseHeaders: vine.record(vine.string()).optional(),
    delayMs: vine.number().min(0).max(5000).optional(),
    isActive: vine.boolean().optional(),
  })
);

export const updateEndpointValidator = vine.compile(
  vine.object({
    method: vine.enum(HTTP_METHODS).optional(),
    path: vine.string().trim().startsWith('/').maxLength(500).optional(),
    statusCode: vine.number().min(100).max(599).optional(),
    responseBody: vine.any().optional(),
    responseHeaders: vine.record(vine.string()).optional(),
    delayMs: vine.number().min(0).max(5000).optional(),
    isActive: vine.boolean().optional(),
  })
);
