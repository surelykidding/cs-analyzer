import { DatabaseError } from 'pg';
import type { PerfectWorldAccount } from 'csdm/common/types/perfect-world-account';
import { db } from 'csdm/node/database/database';
import { PostgresqlErrorCode } from '../postgresql-error-code';

function isMissingJtColumnError(error: unknown) {
  return (
    error instanceof DatabaseError &&
    error.code === PostgresqlErrorCode.UndefinedColumn &&
    ['"jt"', '"is_valid"', '"last_validated_at"', '"last_error"'].some((columnName) => {
      return error.message.includes(columnName);
    })
  );
}

async function upsertPerfectWorldAccountRow(
  account: Omit<PerfectWorldAccount, 'isCurrent'>,
  options?: {
    includeJt?: boolean;
    includeValidationState?: boolean;
  },
) {
  const includeJt = options?.includeJt ?? true;
  const includeValidationState = options?.includeValidationState ?? true;
  const lastValidatedAt = account.lastValidatedAt === null ? new Date() : new Date(account.lastValidatedAt);
  const baseValues = {
    id: account.id,
    user_id: account.userId,
    steam_id: account.steamId,
    nickname: account.nickname,
    avatar_url: account.avatarUrl,
    token: account.token,
    masked_phone_number: account.maskedPhoneNumber,
    is_current: true,
  };
  const insertValues = {
    ...baseValues,
    ...(includeJt ? { jt: account.jt ?? null } : {}),
    ...(includeValidationState
      ? {
          is_valid: account.isValid,
          last_validated_at: lastValidatedAt,
          last_error: account.lastError,
        }
      : {}),
  };
  const updateValues = {
    user_id: account.userId,
    steam_id: account.steamId,
    nickname: account.nickname,
    avatar_url: account.avatarUrl,
    token: account.token,
    masked_phone_number: account.maskedPhoneNumber,
    ...(includeJt ? { jt: account.jt ?? null } : {}),
    ...(includeValidationState
      ? {
          is_valid: account.isValid,
          last_validated_at: lastValidatedAt,
          last_error: account.lastError,
        }
      : {}),
    is_current: true,
  };

  await db.transaction().execute(async (transaction) => {
    await transaction
      .updateTable('perfect_world_accounts')
      .set({
        is_current: false,
      })
      .execute();

    await transaction
      .insertInto('perfect_world_accounts')
      .values(insertValues as never)
      .onConflict((oc) => {
        return oc.column('id').doUpdateSet(updateValues as never);
      })
      .execute();
  });
}

export async function upsertPerfectWorldAccount(account: Omit<PerfectWorldAccount, 'isCurrent'>) {
  try {
    await upsertPerfectWorldAccountRow(account);
  } catch (error) {
    if (!isMissingJtColumnError(error)) {
      throw error;
    }

    logger.warn('Perfect World account import is retrying without the jt column because the local database schema is older than expected.');
    logger.warn(error);
    await upsertPerfectWorldAccountRow(account, {
      includeJt: false,
      includeValidationState: false,
    });
  }
}
