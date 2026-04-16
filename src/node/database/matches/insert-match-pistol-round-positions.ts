import type { DatabaseSettings } from 'csdm/node/settings/settings';
import { executePsql } from 'csdm/node/database/psql/execute-psql';
import { formatHostnameForUri } from 'csdm/node/database/format-hostname-for-uri';
import { getCsvFilePath } from './match-insertion';

const playerPositionColumns = [
  'frame',
  'tick',
  'is_alive',
  'x',
  'y',
  'z',
  'yaw',
  'flash_duration_remaining',
  'side',
  'money',
  'health',
  'armor',
  'has_helmet',
  'has_bomb',
  'has_defuse_kit',
  'is_ducking',
  'is_airborne',
  'is_scoping',
  'is_defusing',
  'is_planting',
  'is_grabbing_hostage',
  'active_weapon_name',
  'equipments',
  'grenades',
  'pistols',
  'smgs',
  'rifles',
  'heavy',
  'player_steam_id',
  'player_name',
  'round_number',
  'match_checksum',
] as const;

type ReplaceTeamTacticsPlayerPositionsParameters = {
  checksum: string;
  databaseSettings: DatabaseSettings;
  demoName: string;
  outputFolderPath: string;
};

export async function replaceTeamTacticsPlayerPositions({
  checksum,
  databaseSettings,
  demoName,
  outputFolderPath,
}: ReplaceTeamTacticsPlayerPositionsParameters) {
  const csvFilePath = getCsvFilePath(outputFolderPath, demoName, '_positions.csv');
  const { database, username, hostname, port, password } = databaseSettings;
  const connectionUri = `postgresql://${username}:${encodeURIComponent(password)}@${formatHostnameForUri(hostname)}:${port}/${database}`;
  const columnNames = playerPositionColumns.join(',');
  const escapedChecksum = checksum.replaceAll("'", "''");
  const escapedCsvFilePath = csvFilePath.replaceAll("'", "''");
  const tempTableName = 'team_tactics_player_positions_import';
  await executePsql([
    '-c',
    `CREATE TEMP TABLE ${tempTableName} (LIKE team_tactics_player_positions INCLUDING DEFAULTS)`,
    '-c',
    `\\copy ${tempTableName}(${columnNames}) FROM '${escapedCsvFilePath}' ENCODING 'UTF8' CSV DELIMITER ','`,
    '-c',
    `BEGIN; DELETE FROM team_tactics_player_positions WHERE match_checksum = '${escapedChecksum}'; INSERT INTO team_tactics_player_positions(${columnNames}) SELECT ${columnNames} FROM ${tempTableName}; COMMIT;`,
    connectionUri,
  ]);
}
