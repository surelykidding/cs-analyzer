import type { Generated, Selectable } from 'kysely';

export type PerfectWorldScoutingTargetTable = {
  id: Generated<number>;
  session_id: string;
  sequence: number;
  match_id: string;
  match_url: string | null;
  cup_id: string | null;
  map_name: string;
  status: string;
  failure_message: string | null;
  local_team_name: string | null;
  demo_checksum: string | null;
  demo_file_path: string | null;
  owns_database_match: boolean;
  owned_download_file_path: string | null;
  roster_overlap_count: number;
  shared_history_player_count: number;
  matched_player_steam_ids_json: string;
};

export type PerfectWorldScoutingTargetRow = Selectable<PerfectWorldScoutingTargetTable>;
