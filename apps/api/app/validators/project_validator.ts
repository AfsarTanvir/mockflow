import vine, { SimpleMessagesProvider } from '@vinejs/vine';
import { msg } from './messages.js';

export const createProjectValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(100),
    basePath: vine.string().trim().startsWith('/').maxLength(255).optional(),
    isPublic: vine.boolean().optional(),
    settings: vine
      .object({
        cors: vine.boolean(),
        log_requests: vine.boolean(),
        global_headers: vine.record(vine.string()).optional(),
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
        global_headers: vine.record(vine.string()).optional(),
      })
      .optional(),
  })
);

const projectMessages = new SimpleMessagesProvider({
  'name.required': msg.required('Name'),
  'name.minLength': msg.minLength('Name', 2),
  'name.maxLength': msg.maxLength('Name', 100),
  'basePath.startsWith': msg.startsWith('Base path', '/'),
  'basePath.maxLength': msg.maxLength('Base path', 255),
});

createProjectValidator.messagesProvider = projectMessages;
updateProjectValidator.messagesProvider = projectMessages;
