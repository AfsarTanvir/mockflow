import vine, { SimpleMessagesProvider } from '@vinejs/vine';
import { msg } from './messages.js';

/* ----------------------------------------------------------------- */
/* Legacy per-project team invites (will be removed in Week 7)        */
/* ----------------------------------------------------------------- */

const INVITE_ROLES = ['admin', 'member', 'viewer'] as const;

export const inviteValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email(),
    role: vine.enum(INVITE_ROLES),
  })
);

export const updateRoleValidator = vine.compile(
  vine.object({
    role: vine.enum(INVITE_ROLES),
  })
);

const teamMessages = new SimpleMessagesProvider({
  'email.required': msg.required('Email'),
  'email.email': msg.email('Email'),
  'role.required': msg.required('Role'),
  'role.enum': msg.enum('Role', INVITE_ROLES),
});

inviteValidator.messagesProvider = teamMessages;
updateRoleValidator.messagesProvider = teamMessages;

/* ----------------------------------------------------------------- */
/* Workspace teams (Week 6+)                                          */
/* ----------------------------------------------------------------- */

const TEAM_VISIBILITY = ['private', 'company_member_only', 'public'] as const;
const TEAM_ROLES = ['admin', 'member'] as const;

const externalLinkSchema = vine.object({
  label: vine.string().trim().minLength(1).maxLength(80),
  url: vine.string().trim().url().maxLength(500),
});

const teamSettingsSchema = vine.object({
  notify_on_member_add: vine.boolean().optional(),
  notify_on_member_remove: vine.boolean().optional(),
});

export const createTeamValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(120),
    description: vine.string().trim().maxLength(2000).optional(),
    visibility: vine.enum(TEAM_VISIBILITY).optional(),
    avatarUrl: vine.string().trim().url().maxLength(500).nullable().optional(),
    color: vine.string().trim().maxLength(20).nullable().optional(),
    externalLinks: vine.array(externalLinkSchema).maxLength(20).optional(),
    settings: teamSettingsSchema.optional(),
  })
);

export const updateTeamValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(120).optional(),
    description: vine.string().trim().maxLength(2000).nullable().optional(),
    visibility: vine.enum(TEAM_VISIBILITY).optional(),
    avatarUrl: vine.string().trim().url().maxLength(500).nullable().optional(),
    color: vine.string().trim().maxLength(20).nullable().optional(),
    externalLinks: vine.array(externalLinkSchema).maxLength(20).optional(),
    settings: teamSettingsSchema.optional(),
  })
);

export const addTeamMemberValidator = vine.compile(
  vine.object({
    profileId: vine.string().uuid(),
    role: vine.enum(TEAM_ROLES).optional(),
  })
);

export const changeTeamMemberRoleValidator = vine.compile(
  vine.object({
    role: vine.enum(TEAM_ROLES),
  })
);

const workspaceTeamMessages = new SimpleMessagesProvider({
  'name.minLength': msg.minLength('Name', 2),
  'name.maxLength': msg.maxLength('Name', 120),
  'visibility.enum': msg.enum('Visibility', TEAM_VISIBILITY),
});

createTeamValidator.messagesProvider = workspaceTeamMessages;
updateTeamValidator.messagesProvider = workspaceTeamMessages;
addTeamMemberValidator.messagesProvider = workspaceTeamMessages;
changeTeamMemberRoleValidator.messagesProvider = workspaceTeamMessages;
