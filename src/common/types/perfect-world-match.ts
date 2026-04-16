import type { Game } from 'csdm/common/types/counter-strike';
import type { DownloadStatus } from 'csdm/common/types/download-status';

export type PerfectWorldPlayer = {
  steamId: string;
  userId: number | null;
  name: string;
  avatarUrl: string;
  team: number | null;
  hasWon: boolean | null;
  killCount: number;
  assistCount: number;
  deathCount: number;
  rating: number | null;
  pwRating: number | null;
};

export type PerfectWorldTeam = {
  name: string;
  score: number;
  playerSteamIds: string[];
};

export type PerfectWorldMatch = {
  id: string;
  game: Game;
  date: string;
  durationInSeconds: number;
  demoUrl: string;
  mapName: string;
  url: string | null;
  cupId: string | null;
  dataSource: number | null;
  mode: string | null;
  players: PerfectWorldPlayer[];
  teams: PerfectWorldTeam[];
  downloadStatus: DownloadStatus;
};
