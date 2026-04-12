import type { Generated, Selectable } from 'kysely';

export type FiveEPlayScoutingSessionTable = {
  id: Generated<string>;
  status: string;
  source_match_id: string;
  source_match_url: string;
  map_name: string;
  our_team_name: string;
  opponent_team_name: string;
  our_team_score: number;
  opponent_team_score: number;
  current_5eplay_account_id: string;
  current_5eplay_account_nickname: string;
  opponent_5eplay_player_ids_json: string;
  error_message: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
};

export type FiveEPlayScoutingSessionRow = Selectable<FiveEPlayScoutingSessionTable>;
