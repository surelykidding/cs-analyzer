import type { EconomyType, TeamNumber } from 'csdm/common/types/counter-strike';
import type { RadarLevel } from 'csdm/ui/maps/radar-level';
import type { PlayerResult } from './search/player-result';

export const TeamTacticsGrenadeType = {
  All: 'all',
  Smoke: 'smoke',
  Flashbang: 'flashbang',
  HeGrenade: 'heGrenade',
  Fire: 'fire',
  Decoy: 'decoy',
} as const;

export type TeamTacticsGrenadeType = (typeof TeamTacticsGrenadeType)[keyof typeof TeamTacticsGrenadeType];

export type WeightedMapPoint = {
  x: number;
  y: number;
  count: number;
};

export const TACTICS_POSITIONS_STORAGE_WINDOW_START_SECONDS = 10;
export const TACTICS_POSITIONS_STORAGE_WINDOW_END_SECONDS = 20;
export const TACTICS_POSITIONS_WINDOW_MIN_SECONDS = TACTICS_POSITIONS_STORAGE_WINDOW_START_SECONDS;
export const TACTICS_POSITIONS_WINDOW_MAX_SECONDS = TACTICS_POSITIONS_STORAGE_WINDOW_END_SECONDS;
export const DEFAULT_TACTICS_T_WINDOW_START_SECONDS = 10;
export const DEFAULT_TACTICS_T_WINDOW_END_SECONDS = 15;
export const DEFAULT_TACTICS_CT_WINDOW_START_SECONDS = 12;
export const DEFAULT_TACTICS_CT_WINDOW_END_SECONDS = 14;

export type TeamTacticsPayload = {
  teamName: string;
  matchChecksums: string[];
  mapName: string;
  side: TeamNumber;
  economyType: EconomyType;
  players?: PlayerResult[];
  ctWindowStartSeconds?: number;
  ctWindowEndSeconds?: number;
  radarLevel: RadarLevel;
  thresholdZ: number | null;
  grenadeType?: TeamTacticsGrenadeType;
};

export type TeamTacticsResponse = {
  side: TeamNumber;
  selectedMatchCount: number;
  analyzedMatchCount: number;
  roundCount: number;
  skippedMatchesWithoutPositions: number;
  skippedMatchChecksums: string[];
  skippedRoundCount: number;
  heGrenadePoints: WeightedMapPoint[];
  ctAwpHeatmapPoints: WeightedMapPoint[];
  fireGrenadePoints: WeightedMapPoint[];
  smokeGrenadePoints: WeightedMapPoint[];
  flashGrenadePoints: WeightedMapPoint[];
  tHeatmapPoints: WeightedMapPoint[];
  killPoints: WeightedMapPoint[];
  deathPoints: WeightedMapPoint[];
  ctHeatmapPoints: WeightedMapPoint[];
};
