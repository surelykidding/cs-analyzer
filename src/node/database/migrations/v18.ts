import type { Kysely } from 'kysely';
import type { Database } from '../schema';
import type { Migration } from './migration';

const v18: Migration = {
  schemaVersion: 18,
  run: async (transaction: Kysely<Database>) => {
    await transaction.schema.alterTable('perfect_world_accounts').addColumn('jt', 'text').execute();
  },
};

export default v18;
