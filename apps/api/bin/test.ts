import 'reflect-metadata';
import { Ignitor, prettyPrintError } from '@adonisjs/core';
import { configure, processCLIArgs, run } from '@japa/runner';

const APP_ROOT = new URL('../', import.meta.url);

const IMPORTER = (filePath: string) => {
  if (filePath.startsWith('./') || filePath.startsWith('../')) {
    return import(new URL(filePath, APP_ROOT).href);
  }
  return import(filePath);
};

new Ignitor(APP_ROOT, { importer: IMPORTER })
  .tap((app) => {
    app.booting(async () => {
      await import('#start/env');
    });
    app.listen('SIGTERM', () => app.terminate());
    app.listenIf(app.managedByPm2, 'SIGINT', () => app.terminate());
  })
  .testRunner()
  .configure(async (app) => {
    const { runnerHooks, plugins } = await import('../tests/bootstrap.js');
    processCLIArgs(process.argv.splice(2));
    configure({
      ...app.rcFile.tests,
      plugins: plugins(app),
      setup: runnerHooks.setup,
      teardown: runnerHooks.teardown,
    });
  })
  .run(() => run())
  .catch((error) => {
    process.exitCode = 1;
    prettyPrintError(error);
  });
