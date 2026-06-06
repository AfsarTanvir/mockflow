import vine from '@vinejs/vine';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

/** Fresh base list/pagination params (factory avoids sharing schema nodes). */
const baseList = () => ({
  page: vine.number().min(1).optional(),
  perPage: vine.number().min(1).max(100).optional(),
  search: vine.string().trim().maxLength(120).optional(),
  sort: vine.string().trim().maxLength(40).optional(),
  dir: vine.enum(['asc', 'desc'] as const).optional(),
});

export const adminListValidator = vine.compile(vine.object(baseList()));

export const adminProfileListValidator = vine.compile(
  vine.object({
    ...baseList(),
    companyId: vine.string().uuid().optional(),
    status: vine.enum(['active', 'suspended', 'inactive'] as const).optional(),
    role: vine.enum(['owner', 'admin', 'member', 'viewer'] as const).optional(),
  })
);

export const adminEndpointListValidator = vine.compile(
  vine.object({
    ...baseList(),
    projectId: vine.string().uuid().optional(),
    method: vine.enum(HTTP_METHODS).optional(),
  })
);

export const adminRequestLogListValidator = vine.compile(
  vine.object({
    ...baseList(),
    projectId: vine.string().uuid().optional(),
    method: vine.enum(HTTP_METHODS).optional(),
    statusCode: vine.number().min(100).max(599).optional(),
  })
);

export const adminChangeRoleValidator = vine.compile(
  vine.object({ role: vine.enum(['admin', 'member', 'viewer'] as const) })
);
