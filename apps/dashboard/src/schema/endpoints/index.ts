import { z } from 'zod';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

// responseBody is managed via a separate textarea (useState), not registered with react-hook-form
export const createEndpointSchema = z.object({
  method: z.enum(HTTP_METHODS),
  path: z.string().min(1, 'Path is required').startsWith('/', 'Path must start with /').max(500),
  statusCode: z.coerce.number().min(100).max(599).optional().default(200),
  delayMs: z.coerce.number().min(0).max(5000).optional().default(0),
  delayMaxMs: z.coerce.number().min(0).max(5000).nullable().optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateEndpointSchema = createEndpointSchema.partial();

export type CreateEndpointInput = z.infer<typeof createEndpointSchema>;
export type UpdateEndpointInput = z.infer<typeof updateEndpointSchema>;
