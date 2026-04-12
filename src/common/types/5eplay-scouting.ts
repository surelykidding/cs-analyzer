import type { EconomyType, TeamNumber } from './counter-strike';
import type { RadarLevel } from 'csdm/ui/maps/radar-level';
import type { TeamTacticsResponse } from './team-tactics';

export const FiveEPlayScoutingSessionStatus = {
  Discovering: 'discovering',
  AwaitingDownloads: 'awaiting-downloads',
  Processing: 'processing',
  Ready: 'ready',
  Error: 'error',
  Deleting: 'deleting',
} as const;
export type FiveEPlayScoutingSessionStatus =
  (typeof FiveEPlayScoutingSessionStatus)[keyof typeof FiveEPlayScoutingSessionStatus];

export const FiveEPlayScoutingTargetStatus = {
  AwaitingDownload: 'awaiting-download',
  Downloading: 'downloading',
  Processing: 'processing',
  Ready: 'ready',
  Error: 'error',
} as const;
export type FiveEPlayScoutingTargetStatus =
  (typeof FiveEPlayScoutingTargetStatus)[keyof typeof FiveEPlayScoutingTargetStatus];

export type FiveEPlayScoutingSourceMatch = {
  id: string;
  url: string;
  mapName: string;
  ourTeamName: string;
  opponentTeamName: string;
  ourTeamScore: number;
  opponentTeamScore: number;
};

export type FiveEPlayScoutingTarget = {
  id: number;
  order: number;
  fiveEPlayMatchId: string;
  url: string;
  mapName: string;
  status: FiveEPlayScoutingTargetStatus;
  failureMessage: string | null;
  localTeamName: string | null;
  demoChecksum: string | null;
  demoFilePath: string | null;
  ownsDatabaseMatch: boolean;
  ownedDownloadFilePath: string | null;
  rosterOverlapCount: number;
  sharedHistoryPlayerCount: number;
};

export type FiveEPlayScoutingSession = {
  id: string;
  status: FiveEPlayScoutingSessionStatus;
  sourceMatch: FiveEPlayScoutingSourceMatch;
  currentAccountId: string;
  currentAccountNickname: string;
  createdAt: string;
  updatedAt: string;
  errorMessage: string | null;
  targets: FiveEPlayScoutingTarget[];
  readyTargetCount: number;
  awaitingDownloadTargetCount: number;
  downloadingTargetCount: number;
  processingTargetCount: number;
  errorTargetCount: number;
};

export type Start5EPlayScoutingSessionPayload = {
  matchIdOrUrl: string;
};

export type Delete5EPlayScoutingSessionPayload = {
  sessionId: string;
};

export type FiveEPlayScoutingTacticsPayload = {
  sessionId: string;
  side: TeamNumber;
  economyType: EconomyType;
  ctWindowStartSeconds: number;
  ctWindowEndSeconds: number;
  radarLevel: RadarLevel;
  thresholdZ: number | null;
};

export type FiveEPlayScoutingTacticsResponse = TeamTacticsResponse;
