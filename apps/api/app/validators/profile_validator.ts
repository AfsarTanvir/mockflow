import vine, { SimpleMessagesProvider } from '@vinejs/vine';
import { msg } from './messages.js';

const VISIBILITY = ['public', 'company_member_only'] as const;
const ROLES = ['owner', 'admin', 'member', 'viewer'] as const;
const ASSIGNABLE_ROLES = ['admin', 'member', 'viewer'] as const;

const linkSchema = vine.object({
  label: vine.string().trim().minLength(1).maxLength(80),
  url: vine.string().trim().url().maxLength(500),
});

const preferencesSchema = vine.object({
  notifications: vine
    .object({
      email: vine.boolean().optional(),
      in_app: vine.boolean().optional(),
    })
    .optional(),
  locale: vine.string().trim().maxLength(20).optional(),
  timezone: vine.string().trim().maxLength(80).optional(),
});

export const updateProfileValidator = vine.compile(
  vine.object({
    displayName: vine.string().trim().minLength(1).maxLength(120).optional(),
    avatarUrl: vine.string().trim().url().maxLength(500).nullable().optional(),
    visibility: vine.enum(VISIBILITY).optional(),
    jobTitle: vine.string().trim().maxLength(120).nullable().optional(),
    department: vine.string().trim().maxLength(80).nullable().optional(),
    phone: vine.string().trim().maxLength(40).nullable().optional(),
    bio: vine.string().trim().maxLength(2000).nullable().optional(),
    links: vine.array(linkSchema).maxLength(20).optional(),
    preferences: preferencesSchema.optional(),
  })
);

export const changeRoleValidator = vine.compile(
  vine.object({
    role: vine.enum(ASSIGNABLE_ROLES),
  })
);

const profileMessages = new SimpleMessagesProvider({
  'displayName.minLength': msg.minLength('Display name', 1),
  'displayName.maxLength': msg.maxLength('Display name', 120),
  'visibility.enum': msg.enum('Visibility', VISIBILITY),
  'role.enum': msg.enum('Role', ROLES),
});

updateProfileValidator.messagesProvider = profileMessages;
changeRoleValidator.messagesProvider = profileMessages;
