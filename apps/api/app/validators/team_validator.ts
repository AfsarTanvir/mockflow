import vine from '@vinejs/vine';

const INVITE_ROLES = ['admin', 'member', 'viewer'] as const;

export const inviteValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email().normalizeEmail(),
    role: vine.enum(INVITE_ROLES),
  })
);

export const updateRoleValidator = vine.compile(
  vine.object({
    role: vine.enum(INVITE_ROLES),
  })
);
