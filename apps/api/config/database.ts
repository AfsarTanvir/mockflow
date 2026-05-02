import { defineConfig } from '@adonisjs/lucid';
import env from '#start/env';

const dbConfig = defineConfig({
  connection: 'postgres',
  connections: {
    postgres: {
      client: 'pg',
      connection: {
        host: env.get('DB_HOST', 'localhost'),
        port: env.get('DB_PORT', 5432),
        user: env.get('DB_USER', 'mockflow'),
        password: env.get('DB_PASSWORD', ''),
        database: env.get('DB_DATABASE', 'mockflow'),
      },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
      seeders: {
        paths: ['database/seeders'],
      },
    },
  },
});

export default dbConfig;
