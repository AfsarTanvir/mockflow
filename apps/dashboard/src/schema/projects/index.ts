import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  basePath: z
    .string()
    .startsWith('/', 'Base path must start with /')
    .max(255)
    .optional()
    .default('/'),
  isPublic: z.boolean().optional().default(false),
});

export const updateProjectSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name is too long')
    .optional(),
  basePath: z
    .string()
    .startsWith('/', 'Base path must start with /')
    .max(255)
    .optional(),
  isPublic: z.boolean().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
