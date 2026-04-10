import type { EconomyType, TeamNumber } from './counter-strike';
import type { RadarLevel } from 'csdm/ui/maps/radar-level';
import type { TeamTacticsResponse } from './team-tactics';

export const FaceitScoutingSessionStatus = {
  Discovering: 'discovering',
  AwaitingDownloads: 'awaiting-downloads',
  Processing: 'processing',
  Ready: 'ready',
  Error: 'error',
  Deleting: 'deleting',
} as const;
export type FaceitScoutingSessionStatus =
  (typeof FaceitScoutingSessionStatus)[keyof typeof FaceitScoutingSessionStatus];

export const FaceitScoutingTargetStatus = {
  AwaitingDownload: 'awaiting-download',
  Processing: 'processing',
  Ready: 'ready',
  Error: 'error',
} as const;
export type FaceitScoutingTargetStatus =
  (typeof FaceitScoutingTargetStatus)[keyof typeof FaceitScoutingTargetStatus];

export type FaceitScoutingSourceMatch = {
  id: string;
  url: string;
  mapName: string;
  ourTeamName: string;
  opponentTeamName: string;
  ourTeamScore: number;
  opponentTeamScore: number;
};

export type FaceitScoutingTarget = {
  id: number;
  order: number;
  faceitMatchId: string;
  url: string;
  mapName: string;
  status: FaceitScoutingTargetStatus;
  failureMessage: string | null;
  localTeamName: string | null;
  demoChecksum: string | null;
  demoFilePath: string | null;
  ownsDatabaseMatch: boolean;
  ownedDownloadFilePath: string | null;
  ownedArchiveFilePath: string | null;
  resourceUrlAvailable: boolean;
  rosterOverlapCount: number;
  sharedHistoryPlayerCount: number;
};

export type FaceitScoutingSession = {
  id: string;
  status: FaceitScoutingSessionStatus;
  sourceMatch: FaceitScoutingSourceMatch;
  currentAccountId: string;
  currentAccountNickname: string;
  createdAt: string;
  updatedAt: string;
  errorMessage: string | null;
  targets: FaceitScoutingTarget[];
  readyTargetCount: number;
  awaitingDownloadTargetCount: number;
  processingTargetCount: number;
  errorTargetCount: number;
};

export type StartFaceitScoutingSessionPayload = {
  matchIdOrUrl: string;
};

export type DeleteFaceitScoutingSessionPayload = {
  sessionId: string;
};

export type FaceitScoutingTacticsPayload = {
  sessionId: string;
  side: TeamNumber;
  economyType: EconomyType;
  ctWindowStartSeconds: number;
  ctWindowEndSeconds: number;
  radarLevel: RadarLevel;
  thresholdZ: number | null;
};

export type FaceitScoutingTacticsResponse = TeamTacticsResponse;
