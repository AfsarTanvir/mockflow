import vine, { SimpleMessagesProvider } from '@vinejs/vine';
import { msg } from './messages.js';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

export const createEndpointValidator = vine.compile(
  vine.object({
    method: vine.enum(HTTP_METHODS),
    path: vine.string().trim().startsWith('/').maxLength(500),
    statusCode: vine.number().min(100).max(599).optional(),
    responseBody: vine.any().optional(),
    responseHeaders: vine.record(vine.string()).optional(),
    delayMs: vine.number().min(0).max(5000).optional(),
    isActive: vine.boolean().optional(),
  })
);

export const updateEndpointValidator = vine.compile(
  vine.object({
    method: vine.enum(HTTP_METHODS).optional(),
    path: vine.string().trim().startsWith('/').maxLength(500).optional(),
    statusCode: vine.number().min(100).max(599).optional(),
    responseBody: vine.any().optional(),
    responseHeaders: vine.record(vine.string()).optional(),
    delayMs: vine.number().min(0).max(5000).optional(),
    isActive: vine.boolean().optional(),
  })
);

const endpointMessages = new SimpleMessagesProvider({
  'method.required': msg.required('Method'),
  'method.enum': msg.enum('Method', HTTP_METHODS),
  'path.required': msg.required('Path'),
  'path.startsWith': msg.startsWith('Path', '/'),
  'path.maxLength': msg.maxLength('Path', 500),
  'statusCode.min': msg.min('Status code', 100),
  'statusCode.max': msg.max('Status code', 599),
  'delayMs.min': msg.min('Delay', 0),
  'delayMs.max': msg.max('Delay', 5000),
});

createEndpointValidator.messagesProvider = endpointMessages;
updateEndpointValidator.messagesProvider = endpointMessages;
