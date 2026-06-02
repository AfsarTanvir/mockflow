import vine, { SimpleMessagesProvider } from '@vinejs/vine';
import { msg } from './messages.js';

export const registerValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(100),
    email: vine.string().trim().email().unique({ table: 'users', column: 'email' }),
    password: vine.string().minLength(8).maxLength(64),
  })
);

export const updateProfileValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(100).optional(),
    currentPassword: vine.string().minLength(6).maxLength(64).optional(),
    newPassword: vine.string().minLength(8).maxLength(64).optional(),
  })
);

export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email(),
    password: vine.string().minLength(6).maxLength(64),
  })
);

export const forgotPasswordValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email(),
  })
);

export const resetPasswordValidator = vine.compile(
  vine.object({
    newPassword: vine.string().minLength(8).maxLength(64),
  })
);

updateProfileValidator.messagesProvider = new SimpleMessagesProvider({
  'name.minLength': msg.minLength('Name', 2),
  'name.maxLength': msg.maxLength('Name', 100),
  'newPassword.minLength': msg.minLength('New password', 8),
  'newPassword.maxLength': msg.maxLength('New password', 64),
});

registerValidator.messagesProvider = new SimpleMessagesProvider({
  'name.required': msg.required('Name'),
  'name.minLength': msg.minLength('Name', 2),
  'name.maxLength': msg.maxLength('Name', 100),
  'email.required': msg.required('Email'),
  'email.email': msg.email('Email'),
  'password.required': msg.required('Password'),
  'password.minLength': msg.minLength('Password', 8),
  'password.maxLength': msg.maxLength('Password', 64),
  'database.unique': msg.unique('Email'),
});

loginValidator.messagesProvider = new SimpleMessagesProvider({
  'email.required': msg.required('Email'),
  'email.email': msg.email('Email'),
  'password.required': msg.required('Password'),
});

forgotPasswordValidator.messagesProvider = new SimpleMessagesProvider({
  'email.required': msg.required('Email'),
  'email.email': msg.email('Email'),
});

resetPasswordValidator.messagesProvider = new SimpleMessagesProvider({
  'newPassword.required': msg.required('New password'),
  'newPassword.minLength': msg.minLength('New password', 8),
  'newPassword.maxLength': msg.maxLength('New password', 64),
});
