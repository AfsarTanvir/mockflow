import { z } from 'zod';

const VISIBILITY = ['private', 'protected', 'public'] as const;
const SIZE_BUCKETS = ['1-10', '11-50', '51-200', '201-1000', '1000+'] as const;

const settingsSchema = z.object({
  locale: z.string().max(20).optional(),
  timezone: z.string().max(80).optional(),
  members_can_create_teams: z.boolean().optional(),
  members_can_create_projects: z.boolean().optional(),
});

const billingAddressSchema = z.object({
  line1: z.string().max(200).optional(),
  line2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  region: z.string().max(80).optional(),
  postal: z.string().max(20).optional(),
  country: z.string().length(2).optional(),
});

export const createCompanySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(120),
  visibility: z.enum(VISIBILITY).optional().default('private'),
  logoUrl: z.string().url().max(500).optional().nullable(),
  avatarUrl: z.string().url().max(500).optional().nullable(),
  description: z.string().max(2000).optional(),
  website: z.string().url().max(255).optional(),
  industry: z.string().max(80).optional(),
  sizeBucket: z.enum(SIZE_BUCKETS).optional(),
  billingEmail: z.string().email().max(255).optional(),
  billingAddress: billingAddressSchema.optional(),
  settings: settingsSchema.optional(),
});

export const updateCompanySchema = createCompanySchema.partial();

export const transferOwnershipSchema = z.object({
  newOwnerProfileId: z.string().uuid(),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type TransferOwnershipInput = z.infer<typeof transferOwnershipSchema>;
