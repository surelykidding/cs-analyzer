import type { Kysely } from 'kysely';
import type { Database } from '../schema';
import type { Migration } from './migration';

const v19: Migration = {
  schemaVersion: 19,
  run: async (transaction: Kysely<Database>) => {
    await transaction.schema.alterTable('perfect_world_accounts').addColumn('is_valid', 'boolean').execute();
    await transaction.schema.alterTable('perfect_world_accounts').addColumn('last_validated_at', 'timestamptz').execute();
    await transaction.schema.alterTable('perfect_world_accounts').addColumn('last_error', 'text').execute();

    await transaction
      .updateTable('perfect_world_accounts')
      .set({
        is_valid: true,
        last_validated_at: null,
        last_error: null,
      })
      .execute();

    await transaction.schema
      .alterTable('perfect_world_accounts')
      .alterColumn('is_valid', (col) => col.setNotNull())
      .execute();
  },
};

export default v19;
