import { BaseSeeder } from '@adonisjs/lucid/seeders';
import User from '../../app/models/user.js';
import Company from '../../app/models/company.js';
import * as CompanyService from '../../app/services/company_service.js';

/**
 * Development seed data (idempotent — safe to re-run).
 *
 * - A verified dev user (dev@mockflow.test / password123) owning "Acme Inc".
 * - A master "agency" company "MockFlow Ops" with the STABLE slug `mockflow-ops`,
 *   owned by the dev user. Set `MASTER_COMPANY_SLUG=mockflow-ops` in .env to make
 *   the dev user a platform super-admin (see app/services/admin_access_service.ts).
 */
const MASTER_COMPANY_SLUG = 'mockflow-ops';

export default class extends BaseSeeder {
  async run() {
    const email = 'dev@mockflow.test';

    let user = await User.findBy('email', email);
    if (!user) {
      user = await User.create({
        name: 'Dev User',
        email,
        password: 'password123',
        emailVerified: true,
      });
      await CompanyService.createCompany(user.id, { name: 'Acme Inc', visibility: 'private' });
    }

    // Master agency workspace with a fixed slug (createCompany slugifies with a
    // random suffix, so override it after creation).
    const existingMaster = await Company.findBy('slug', MASTER_COMPANY_SLUG);
    if (!existingMaster) {
      const { company } = await CompanyService.createCompany(user.id, {
        name: 'MockFlow Ops',
        visibility: 'private',
      });
      company.slug = MASTER_COMPANY_SLUG;
      await company.save();
    }
  }
}
