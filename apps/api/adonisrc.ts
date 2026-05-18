import { defineConfig } from '@adonisjs/core/app';

export default defineConfig({
  /*
  |--------------------------------------------------------------------------
  | Commands
  |--------------------------------------------------------------------------
  */
  commands: [() => import('@adonisjs/core/commands'), () => import('@adonisjs/lucid/commands')],

  /*
  |--------------------------------------------------------------------------
  | Service Providers
  |--------------------------------------------------------------------------
  */
  providers: [
    () => import('@adonisjs/core/providers/app_provider'),
    () => import('@adonisjs/core/providers/hash_provider'),
    {
      file: () => import('@adonisjs/core/providers/repl_provider'),
      environment: ['repl'],
    },
    () => import('@adonisjs/core/providers/vinejs_provider'),
    () => import('@adonisjs/lucid/database_provider'),
    () => import('@adonisjs/auth/auth_provider'),
    () => import('@adonisjs/cors/cors_provider'),
  ],

  preloads: [
    () => import('#start/kernel'),
    () => import('#start/routes'),
  ],

  /*
  |--------------------------------------------------------------------------
  | Tests
  |--------------------------------------------------------------------------
  */
  tests: {
    suites: [
      {
        name: 'unit',
        files: ['tests/unit/**/*.spec.ts', 'tests/unit/**/*.spec.js'],
        timeout: 2000,
      },
      {
        name: 'integration',
        files: ['tests/integration/**/*.spec.ts', 'tests/integration/**/*.spec.js'],
        timeout: 30000,
      },
    ],
    forceExit: false,
  },
});
