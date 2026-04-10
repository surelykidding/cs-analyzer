import type { Migration } from './migration';

const v13: Migration = {
  schemaVersion: 13,
  run: async (transaction) => {
    await transaction.schema
      .createIndex('kills_match_checksum_round_number_idx')
      .ifNotExists()
      .on('kills')
      .columns(['match_checksum', 'round_number'])
      .execute();
  },
};

export default v13;
