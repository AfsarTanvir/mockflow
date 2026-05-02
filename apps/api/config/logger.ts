import { defineConfig } from '@adonisjs/core/logger';

const loggerConfig = defineConfig({
  default: 'app',
  loggers: {
    app: {
      enabled: true,
      name: 'mockflow',
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
  },
});

export default loggerConfig;
