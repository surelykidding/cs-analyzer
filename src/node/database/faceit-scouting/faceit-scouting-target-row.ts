import type { Generated, Selectable } from 'kysely';

export type FaceitScoutingTargetTable = {
  id: Generated<number>;
  session_id: string;
  sequence: number;
  faceit_match_id: string;
  faceit_match_url: string;
  map_name: string;
  status: string;
  failure_message: string | null;
  local_team_name: string | null;
  demo_checksum: string | null;
  demo_file_path: string | null;
  owns_database_match: boolean;
  owned_download_file_path: string | null;
  owned_archive_file_path: string | null;
  resource_url_available: boolean;
  roster_overlap_count: number;
  shared_history_player_count: number;
};

export type FaceitScoutingTargetRow = Selectable<FaceitScoutingTargetTable>;
