import type { Selectable } from 'kysely';

export type PerfectWorldAccountTable = {
  id: string;
  user_id: number;
  steam_id: string;
  nickname: string;
  avatar_url: string;
  token: string;
  jt: string | null;
  masked_phone_number: string | null;
  is_valid: boolean;
  last_validated_at: Date | null;
  last_error: string | null;
  is_current: boolean;
};

export type PerfectWorldAccountRow = Selectable<PerfectWorldAccountTable>;
