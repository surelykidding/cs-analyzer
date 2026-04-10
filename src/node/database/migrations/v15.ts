import { sql, type Kysely } from 'kysely';
import type { Database } from '../schema';
import type { Migration } from './migration';

const v15: Migration = {
  schemaVersion: 15,
  run: async (transaction: Kysely<Database>) => {
    await transaction.schema
      .createTable('faceit_scouting_sessions')
      .ifNotExists()
      .addColumn('id', 'uuid', (col) => col.primaryKey().notNull().defaultTo(sql`gen_random_uuid()`))
      .addColumn('status', 'varchar', (col) => col.notNull())
      .addColumn('source_match_id', 'varchar', (col) => col.notNull())
      .addColumn('source_match_url', 'text', (col) => col.notNull())
      .addColumn('map_name', 'varchar', (col) => col.notNull())
      .addColumn('our_team_name', 'varchar', (col) => col.notNull())
      .addColumn('opponent_team_name', 'varchar', (col) => col.notNull())
      .addColumn('our_team_score', 'integer', (col) => col.notNull())
      .addColumn('opponent_team_score', 'integer', (col) => col.notNull())
      .addColumn('current_faceit_account_id', 'varchar', (col) => col.notNull())
      .addColumn('current_faceit_account_nickname', 'varchar', (col) => col.notNull())
      .addColumn('opponent_faceit_player_ids_json', 'text', (col) => col.notNull())
      .addColumn('opponent_steam_ids_json', 'text', (col) => col.notNull())
      .addColumn('error_message', 'text')
      .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
      .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
      .execute();

    await transaction.schema
      .createTable('faceit_scouting_targets')
      .ifNotExists()
      .addColumn('id', 'bigserial', (col) => col.primaryKey().notNull())
      .addColumn('session_id', 'uuid', (col) => col.notNull())
      .addForeignKeyConstraint(
        'faceit_scouting_targets_session_id_fk',
        ['session_id'],
        'faceit_scouting_sessions',
        ['id'],
        (cb) => cb.onDelete('cascade'),
      )
      .addColumn('sequence', 'integer', (col) => col.notNull())
      .addColumn('faceit_match_id', 'varchar', (col) => col.notNull())
      .addColumn('faceit_match_url', 'text', (col) => col.notNull())
      .addColumn('map_name', 'varchar', (col) => col.notNull())
      .addColumn('status', 'varchar', (col) => col.notNull())
      .addColumn('failure_message', 'text')
      .addColumn('local_team_name', 'varchar')
      .addColumn('demo_checksum', 'varchar')
      .addColumn('demo_file_path', 'text')
      .addColumn('owns_database_match', 'boolean', (col) => col.notNull().defaultTo(false))
      .addColumn('owned_download_file_path', 'text')
      .addColumn('owned_archive_file_path', 'text')
      .addColumn('resource_url_available', 'boolean', (col) => col.notNull().defaultTo(false))
      .addColumn('roster_overlap_count', 'integer', (col) => col.notNull().defaultTo(0))
      .addColumn('shared_history_player_count', 'integer', (col) => col.notNull().defaultTo(0))
      .execute();

    await transaction.schema
      .createIndex('faceit_scouting_targets_session_id_idx')
      .ifNotExists()
      .on('faceit_scouting_targets')
      .columns(['session_id', 'sequence'])
      .execute();

    await transaction.schema
      .createIndex('faceit_scouting_targets_faceit_match_id_idx')
      .ifNotExists()
      .on('faceit_scouting_targets')
      .columns(['faceit_match_id'])
      .execute();
  },
};

export default v15;
