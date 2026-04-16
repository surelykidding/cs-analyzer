import type { Generated, Selectable } from 'kysely';

export type PerfectWorldScoutingSessionTable = {
  id: Generated<string>;
  status: string;
  source_match_id: string;
  source_match_url: string | null;
  map_name: string;
  our_team_name: string;
  opponent_team_name: string;
  our_team_score: number;
  opponent_team_score: number;
  cup_id: string | null;
  current_perfect_world_account_id: string;
  current_perfect_world_account_nickname: string;
  opponent_steam_ids_json: string;
  error_message: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
};

export type PerfectWorldScoutingSessionRow = Selectable<PerfectWorldScoutingSessionTable>;
