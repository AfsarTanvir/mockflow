import { Env } from '@adonisjs/core/env';

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  APP_PORT: Env.schema.number.optional(),
  APP_HOST: Env.schema.string.optional(),
  APP_SECRET: Env.schema.string(),

  DB_CONNECTION: Env.schema.string(),
  DB_HOST: Env.schema.string(),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string(),
  DB_DATABASE: Env.schema.string(),

  REDIS_HOST: Env.schema.string.optional(),
  REDIS_PORT: Env.schema.number.optional(),
});
