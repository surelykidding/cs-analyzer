import type { PerfectWorldAccount } from 'csdm/common/types/perfect-world-account';
import type { PerfectWorldAccountRow } from './perfect-world-account-row';

export function perfectWorldAccountRowToAccount(row: PerfectWorldAccountRow): PerfectWorldAccount {
  return {
    id: row.id,
    userId: row.user_id,
    steamId: row.steam_id,
    nickname: row.nickname,
    avatarUrl: row.avatar_url,
    token: row.token,
    jt: row.jt,
    maskedPhoneNumber: row.masked_phone_number,
    isValid: row.is_valid,
    lastValidatedAt: row.last_validated_at?.toISOString() ?? null,
    lastError: row.last_error,
    isCurrent: row.is_current,
  };
}
