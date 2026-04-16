import type { EconomyType, TeamNumber } from './counter-strike';
import type { RadarLevel } from 'csdm/ui/maps/radar-level';
import type { TeamTacticsResponse } from './team-tactics';

export const PerfectWorldScoutingSessionStatus = {
  Discovering: 'discovering',
  AwaitingDownloads: 'awaiting-downloads',
  Processing: 'processing',
  Ready: 'ready',
  Error: 'error',
  Deleting: 'deleting',
} as const;
export type PerfectWorldScoutingSessionStatus =
  (typeof PerfectWorldScoutingSessionStatus)[keyof typeof PerfectWorldScoutingSessionStatus];

export const PerfectWorldScoutingTargetStatus = {
  AwaitingDownload: 'awaiting-download',
  Downloading: 'downloading',
  Processing: 'processing',
  Ready: 'ready',
  Error: 'error',
} as const;
export type PerfectWorldScoutingTargetStatus =
  (typeof PerfectWorldScoutingTargetStatus)[keyof typeof PerfectWorldScoutingTargetStatus];

export type PerfectWorldScoutingSourceMatch = {
  id: string;
  url: string | null;
  mapName: string;
  ourTeamName: string;
  opponentTeamName: string;
  ourTeamScore: number;
  opponentTeamScore: number;
  cupId: string | null;
};

export type PerfectWorldScoutingTarget = {
  id: number;
  order: number;
  perfectWorldMatchId: string;
  cupId: string | null;
  url: string | null;
  mapName: string;
  status: PerfectWorldScoutingTargetStatus;
  failureMessage: string | null;
  localTeamName: string | null;
  demoChecksum: string | null;
  demoFilePath: string | null;
  ownsDatabaseMatch: boolean;
  ownedDownloadFilePath: string | null;
  rosterOverlapCount: number;
  sharedHistoryPlayerCount: number;
};

export type PerfectWorldScoutingSession = {
  id: string;
  status: PerfectWorldScoutingSessionStatus;
  sourceMatch: PerfectWorldScoutingSourceMatch;
  currentAccountId: string;
  currentAccountNickname: string;
  createdAt: string;
  updatedAt: string;
  errorMessage: string | null;
  targets: PerfectWorldScoutingTarget[];
  readyTargetCount: number;
  awaitingDownloadTargetCount: number;
  downloadingTargetCount: number;
  processingTargetCount: number;
  errorTargetCount: number;
};

export type StartPerfectWorldScoutingSessionPayload = {
  matchId: string;
  participantSteamId?: string;
};

export type DeletePerfectWorldScoutingSessionPayload = {
  sessionId: string;
};

export type PerfectWorldScoutingTacticsPayload = {
  sessionId: string;
  side: TeamNumber;
  economyType: EconomyType;
  ctWindowStartSeconds: number;
  ctWindowEndSeconds: number;
  radarLevel: RadarLevel;
  thresholdZ: number | null;
};

export type PerfectWorldScoutingTacticsResponse = TeamTacticsResponse;
