import { db } from 'csdm/node/database/database';
import { perfectWorldAccountRowToAccount } from './perfect-world-account-row-to-account';

type Payload = {
  accountId: string;
  isValid: boolean;
  lastValidatedAt: Date;
  lastError: string | null;
  nickname?: string;
  avatarUrl?: string;
};

export async function updatePerfectWorldAccountValidation({
  accountId,
  isValid,
  lastValidatedAt,
  lastError,
  nickname,
  avatarUrl,
}: Payload) {
  const row = await db
    .updateTable('perfect_world_accounts')
    .set({
      is_valid: isValid,
      last_validated_at: lastValidatedAt,
      last_error: lastError,
      ...(nickname !== undefined ? { nickname } : {}),
      ...(avatarUrl !== undefined ? { avatar_url: avatarUrl } : {}),
    })
    .where('id', '=', accountId)
    .returningAll()
    .executeTakeFirst();

  if (row === undefined) {
    return undefined;
  }

  return perfectWorldAccountRowToAccount(row);
}
