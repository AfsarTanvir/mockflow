import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import Project from './project.js';
import User from './user.js';
import type { RuleOperator, RuleSource } from './scenario_rule.js';

export type SnapshotRule = {
  source: RuleSource;
  field: string;
  operator: RuleOperator;
  value: string | null;
};

export type SnapshotScenario = {
  name: string;
  description: string | null;
  statusCode: number | null;
  responseBody: Record<string, unknown> | null;
  responseHeaders: Record<string, string> | null;
  delayMs: number | null;
  delayMaxMs: number | null;
  isActive: boolean;
  priority: number;
  rules: SnapshotRule[];
};

/**
 * A project snapshot. `format: 2` (Oct 2026+) also captures each endpoint's
 * random delay and its scenarios + rules; older snapshots lack those fields,
 * so they're optional and restore treats them as absent.
 */
export type VersionSnapshot = {
  format?: 2;
  project: {
    name: string;
    slug: string;
    basePath: string;
    isPublic: boolean;
    settings: { cors: boolean; log_requests: boolean; global_headers?: Record<string, string> };
  };
  endpoints: Array<{
    method: string;
    path: string;
    statusCode: number;
    responseBody: Record<string, unknown> | null;
    responseHeaders: Record<string, string>;
    delayMs: number;
    delayMaxMs?: number | null;
    isActive: boolean;
    scenarios?: SnapshotScenario[];
  }>;
};

export default class VersionHistory extends BaseModel {
  static table = 'version_history';

  @column({ isPrimary: true })
  declare id: string;

  @column()
  declare projectId: string;

  @column({
    prepare: (value) => JSON.stringify(value),
    consume: (value) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare snapshot: VersionSnapshot;

  @column()
  declare message: string | null;

  @column()
  declare createdBy: string | null;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @belongsTo(() => Project, { foreignKey: 'projectId' })
  declare project: BelongsTo<typeof Project>;

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare author: BelongsTo<typeof User>;
}
