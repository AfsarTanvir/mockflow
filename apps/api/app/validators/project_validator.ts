import vine from '@vinejs/vine';

export const createProjectValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(100),
    basePath: vine.string().trim().startsWith('/').maxLength(255).optional(),
    isPublic: vine.boolean().optional(),
    settings: vine
      .object({
        cors: vine.boolean(),
        log_requests: vine.boolean(),
      })
      .optional(),
  })
);

export const updateProjectValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(100).optional(),
    basePath: vine.string().trim().startsWith('/').maxLength(255).optional(),
    isPublic: vine.boolean().optional(),
    settings: vine
      .object({
        cors: vine.boolean(),
        log_requests: vine.boolean(),
      })
      .optional(),
  })
);
