import Company from '#models/company';
import CompanyMetadata from '#models/company_metadata';
import type { TransactionClientContract } from '@adonisjs/lucid/types/database';

/** Data-access for `companies` / `company_metadata`. Pure reads; optional trx client. */

export function findById(id: string, client?: TransactionClientContract) {
  return Company.find(id, { client });
}

export function findBySlug(slug: string, client?: TransactionClientContract) {
  return Company.findBy('slug', slug, { client });
}

export function findMetadata(companyId: string, client?: TransactionClientContract) {
  return CompanyMetadata.find(companyId, { client });
}
