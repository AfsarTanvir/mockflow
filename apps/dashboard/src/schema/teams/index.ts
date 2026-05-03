import { z } from 'zod';

export const inviteMemberSchema = z.object({
  email: z.string().email('Enter a valid email'),
  role: z.enum(['admin', 'member', 'viewer']),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const updateRoleSchema = z.object({
  role: z.enum(['admin', 'member', 'viewer']),
});

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
