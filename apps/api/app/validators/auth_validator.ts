import vine, { SimpleMessagesProvider } from '@vinejs/vine';
import { msg } from './messages.js';

export const registerValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(100),
    email: vine
      .string()
      .trim()
      .email()
      .normalizeEmail()
      .unique({ table: 'users', column: 'email' }),
    password: vine.string().minLength(8).maxLength(64),
  })
);

export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email().normalizeEmail(),
    password: vine.string().minLength(6).maxLength(64),
  })
);

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
