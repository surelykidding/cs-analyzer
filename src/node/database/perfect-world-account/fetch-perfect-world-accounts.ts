import { DatabaseError } from 'pg';
import { sql } from 'kysely';
import type { PerfectWorldAccount } from 'csdm/common/types/perfect-world-account';
import { db } from 'csdm/node/database/database';
import { PostgresqlErrorCode } from '../postgresql-error-code';
import { perfectWorldAccountRowToAccount } from './perfect-world-account-row-to-account';

function isMissingPerfectWorldAccountColumnError(error: unknown) {
  return (
    error instanceof DatabaseError &&
    error.code === PostgresqlErrorCode.UndefinedColumn &&
    ['"jt"', '"is_valid"', '"last_validated_at"', '"last_error"'].some((columnName) => {
      return error.message.includes(columnName);
    })
  );
}

export async function fetchPerfectWorldAccounts() {
  let rows;

  try {
    rows = await db.selectFrom('perfect_world_accounts').selectAll().orderBy('nickname').execute();
  } catch (error) {
    if (!isMissingPerfectWorldAccountColumnError(error)) {
      throw error;
    }

    rows = await db
      .selectFrom('perfect_world_accounts')
      .select([
        'id',
        'user_id',
        'steam_id',
        'nickname',
        'avatar_url',
        'token',
        sql<string | null>`NULL`.as('jt'),
        'masked_phone_number',
        sql<boolean>`TRUE`.as('is_valid'),
        sql<Date | null>`NULL`.as('last_validated_at'),
        sql<string | null>`NULL`.as('last_error'),
        'is_current',
      ])
      .orderBy('nickname')
      .execute();
  }

  const accounts: PerfectWorldAccount[] = rows.map(perfectWorldAccountRowToAccount);

  return accounts;
}
