import vine, { SimpleMessagesProvider } from '@vinejs/vine';
import { msg } from './messages.js';

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

const teamMessages = new SimpleMessagesProvider({
  'email.required': msg.required('Email'),
  'email.email': msg.email('Email'),
  'role.required': msg.required('Role'),
  'role.enum': msg.enum('Role', INVITE_ROLES),
});

inviteValidator.messagesProvider = teamMessages;
updateRoleValidator.messagesProvider = teamMessages;
