import vine, { SimpleMessagesProvider } from '@vinejs/vine';
import { msg } from './messages.js';

const VISIBILITY = ['private', 'protected', 'public'] as const;
const SIZE_BUCKETS = ['1-10', '11-50', '51-200', '201-1000', '1000+'] as const;

const settingsSchema = vine.object({
  locale: vine.string().trim().maxLength(20).optional(),
  timezone: vine.string().trim().maxLength(80).optional(),
  members_can_create_teams: vine.boolean().optional(),
  members_can_create_projects: vine.boolean().optional(),
});

const billingAddressSchema = vine.object({
  line1: vine.string().trim().maxLength(200).optional(),
  line2: vine.string().trim().maxLength(200).optional(),
  city: vine.string().trim().maxLength(100).optional(),
  region: vine.string().trim().maxLength(80).optional(),
  postal: vine.string().trim().maxLength(20).optional(),
  country: vine.string().trim().fixedLength(2).optional(),
});

export const createCompanyValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(120),
    visibility: vine.enum(VISIBILITY).optional(),
    logoUrl: vine.string().trim().url().maxLength(500).nullable().optional(),
    avatarUrl: vine.string().trim().url().maxLength(500).nullable().optional(),
    description: vine.string().trim().maxLength(2000).optional(),
    website: vine.string().trim().url().maxLength(255).optional(),
    industry: vine.string().trim().maxLength(80).optional(),
    sizeBucket: vine.enum(SIZE_BUCKETS).optional(),
    billingEmail: vine.string().trim().email().maxLength(255).optional(),
    billingAddress: billingAddressSchema.optional(),
    settings: settingsSchema.optional(),
  })
);

export const updateCompanyValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(120).optional(),
    visibility: vine.enum(VISIBILITY).optional(),
    logoUrl: vine.string().trim().url().maxLength(500).nullable().optional(),
    avatarUrl: vine.string().trim().url().maxLength(500).nullable().optional(),
    description: vine.string().trim().maxLength(2000).nullable().optional(),
    website: vine.string().trim().url().maxLength(255).nullable().optional(),
    industry: vine.string().trim().maxLength(80).nullable().optional(),
    sizeBucket: vine.enum(SIZE_BUCKETS).nullable().optional(),
    billingEmail: vine.string().trim().email().maxLength(255).nullable().optional(),
    billingAddress: billingAddressSchema.nullable().optional(),
    settings: settingsSchema.optional(),
  })
);

export const transferOwnershipValidator = vine.compile(
  vine.object({
    newOwnerProfileId: vine.string().uuid(),
  })
);

const companyMessages = new SimpleMessagesProvider({
  'name.required': msg.required('Name'),
  'name.minLength': msg.minLength('Name', 2),
  'name.maxLength': msg.maxLength('Name', 120),
  'visibility.enum': msg.enum('Visibility', VISIBILITY),
  'sizeBucket.enum': msg.enum('Size bucket', SIZE_BUCKETS),
});

createCompanyValidator.messagesProvider = companyMessages;
updateCompanyValidator.messagesProvider = companyMessages;
