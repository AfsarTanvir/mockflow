import { BaseSeeder } from '@adonisjs/lucid/seeders';
import User from '../../app/models/user.js';
import * as CompanyService from '../../app/services/company_service.js';

/**
 * Development seed data.
 *
 * Creates a single verified user and an owning company (the CompanyService
 * also provisions the owner profile + metadata in the same transaction).
 * Idempotent: re-running skips creation if the dev user already exists.
 *
 * Login: dev@mockflow.test / password123
 */
export default class extends BaseSeeder {
  async run() {
    const email = 'dev@mockflow.test';

    const existing = await User.findBy('email', email);
    if (existing) {
      return;
    }

    const user = await User.create({
      name: 'Dev User',
      email,
      password: 'password123',
      emailVerified: true,
    });

    await CompanyService.createCompany(user.id, {
      name: 'Acme Inc',
      visibility: 'private',
    });
  }
}
