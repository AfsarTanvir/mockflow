import { z } from 'zod';

/* ----------------------------------------------------------------- */
/* Legacy per-project team invites (will be removed in Week 7)        */
/* ----------------------------------------------------------------- */

export const inviteMemberSchema = z.object({
  email: z.string().email('Enter a valid email'),
  role: z.enum(['admin', 'member', 'viewer']),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const updateRoleSchema = z.object({
  role: z.enum(['admin', 'member', 'viewer']),
});

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

/* ----------------------------------------------------------------- */
/* Workspace teams (Week 6+)                                          */
/* ----------------------------------------------------------------- */

const WORKSPACE_TEAM_VISIBILITY = ['private', 'company_member_only', 'public'] as const;
const WORKSPACE_TEAM_ROLES = ['admin', 'member'] as const;

const externalLinkSchema = z.object({
  label: z.string().min(1).max(80),
  url: z.string().url().max(500),
});

const teamSettingsSchema = z.object({
  notify_on_member_add: z.boolean().optional(),
  notify_on_member_remove: z.boolean().optional(),
});

export const createTeamSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(120),
  description: z.string().max(2000).optional(),
  visibility: z.enum(WORKSPACE_TEAM_VISIBILITY).optional().default('private'),
  avatarUrl: z.string().url().max(500).optional().nullable(),
  color: z.string().max(20).optional().nullable(),
  externalLinks: z.array(externalLinkSchema).max(20).optional(),
  settings: teamSettingsSchema.optional(),
});

export const updateTeamSchema = createTeamSchema.partial();

export const addTeamMemberSchema = z.object({
  profileId: z.string().uuid(),
  role: z.enum(WORKSPACE_TEAM_ROLES).optional(),
});

export const changeTeamRoleSchema = z.object({
  role: z.enum(WORKSPACE_TEAM_ROLES),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type AddTeamMemberInput = z.infer<typeof addTeamMemberSchema>;
export type ChangeTeamRoleInput = z.infer<typeof changeTeamRoleSchema>;
