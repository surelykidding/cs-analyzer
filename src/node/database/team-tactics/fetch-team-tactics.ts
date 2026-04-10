import { uniqueArray } from 'csdm/common/array/unique-array';
import { Game, TeamNumber } from 'csdm/common/types/counter-strike';
import {
  TeamTacticsGrenadeType,
  type TeamTacticsPayload,
  type TeamTacticsResponse,
} from 'csdm/common/types/team-tactics';
import { db } from 'csdm/node/database/database';
import { fetchCtAwpHolderHeatmap } from './fetch-ct-awp-holder-heatmap';
import { fetchCtFirst20SecondsHeatmap } from './fetch-ct-first20s-heatmap';
import { fetchTDeathPositions } from './fetch-t-death-positions';
import { fetchTFirst20SecondsHeatmap } from './fetch-t-first20s-heatmap';
import { fetchTeamTacticsRounds } from './fetch-team-tactics-rounds';
import { fetchTeamGrenadeFrequency } from './fetch-t-grenade-frequency';
import { fetchTKillPositions } from './fetch-t-kill-positions';
import { fetchEffectivePositionRounds } from './fetch-effective-position-rounds';

async function fetchMapScale(mapName: string) {
  const row = await db
    .selectFrom('maps')
    .select('scale')
    .where('name', '=', mapName)
    .where('game', '=', Game.CS2)
    .executeTakeFirst();

  if (!row) {
    throw new Error(`Map ${mapName} not found`);
  }

  return row.scale;
}

export async function fetchTeamTactics(payload: TeamTacticsPayload): Promise<TeamTacticsResponse> {
  if (payload.matchChecksums.length === 0) {
    return {
      side: payload.side,
      selectedMatchCount: 0,
      analyzedMatchCount: 0,
      roundCount: 0,
      skippedMatchesWithoutPositions: 0,
      skippedMatchChecksums: [],
      skippedRoundCount: 0,
      heGrenadePoints: [],
      ctAwpHeatmapPoints: [],
      fireGrenadePoints: [],
      smokeGrenadePoints: [],
      flashGrenadePoints: [],
      tHeatmapPoints: [],
      killPoints: [],
      deathPoints: [],
      ctHeatmapPoints: [],
    };
  }

  const mapScale = await fetchMapScale(payload.mapName);
  const rounds = await fetchTeamTacticsRounds(
    payload.matchChecksums,
    payload.teamName,
    payload.mapName,
    payload.side,
    payload.economyType,
  );
  const analyzedMatchCount = uniqueArray(rounds.map((round) => round.matchChecksum)).length;

  if (payload.side === TeamNumber.T) {
    const positionRounds = await fetchEffectivePositionRounds(
      uniqueArray(rounds.map((round) => round.matchChecksum)),
      uniqueArray(rounds.map((round) => round.roundNumber)),
    );
    const availablePositionRounds = new Set(positionRounds.map((round) => `${round.matchChecksum}:${round.roundNumber}`));
    const roundsWithPositions = rounds.filter((round) => {
      return availablePositionRounds.has(`${round.matchChecksum}:${round.roundNumber}`);
    });
    const skippedRounds = rounds.filter((round) => {
      return !availablePositionRounds.has(`${round.matchChecksum}:${round.roundNumber}`);
    });
    const [fireGrenadePoints, smokeGrenadePoints, flashGrenadePoints, tHeatmapPoints, killPoints, deathPoints] =
      await Promise.all([
      fetchTeamGrenadeFrequency(rounds, payload, mapScale, TeamTacticsGrenadeType.Fire),
      fetchTeamGrenadeFrequency(rounds, payload, mapScale, TeamTacticsGrenadeType.Smoke),
      fetchTeamGrenadeFrequency(rounds, payload, mapScale, TeamTacticsGrenadeType.Flashbang),
      fetchTFirst20SecondsHeatmap(roundsWithPositions, payload, mapScale),
      fetchTKillPositions(rounds, payload, mapScale),
      fetchTDeathPositions(rounds, payload, mapScale),
    ]);

    return {
      side: payload.side,
      selectedMatchCount: payload.matchChecksums.length,
      analyzedMatchCount,
      roundCount: rounds.length,
      skippedMatchesWithoutPositions: uniqueArray(skippedRounds.map((round) => round.matchChecksum)).length,
      skippedMatchChecksums: uniqueArray(skippedRounds.map((round) => round.matchChecksum)),
      skippedRoundCount: skippedRounds.length,
      heGrenadePoints: [],
      ctAwpHeatmapPoints: [],
      fireGrenadePoints,
      smokeGrenadePoints,
      flashGrenadePoints,
      tHeatmapPoints,
      killPoints,
      deathPoints,
      ctHeatmapPoints: [],
    };
  }

  const positionRounds = await fetchEffectivePositionRounds(
    uniqueArray(rounds.map((round) => round.matchChecksum)),
    uniqueArray(rounds.map((round) => round.roundNumber)),
  );
  const availablePositionRounds = new Set(positionRounds.map((round) => `${round.matchChecksum}:${round.roundNumber}`));
  const roundsWithPositions = rounds.filter((round) => {
    return availablePositionRounds.has(`${round.matchChecksum}:${round.roundNumber}`);
  });
  const skippedRounds = rounds.filter((round) => {
    return !availablePositionRounds.has(`${round.matchChecksum}:${round.roundNumber}`);
  });
  const [ctHeatmapPoints, ctAwpHeatmapPoints, heGrenadePoints] = await Promise.all([
    fetchCtFirst20SecondsHeatmap(roundsWithPositions, payload, mapScale),
    fetchCtAwpHolderHeatmap(roundsWithPositions, payload, mapScale),
    fetchTeamGrenadeFrequency(rounds, payload, mapScale, TeamTacticsGrenadeType.HeGrenade),
  ]);

  return {
    side: payload.side,
    selectedMatchCount: payload.matchChecksums.length,
    analyzedMatchCount,
    roundCount: rounds.length,
    skippedMatchesWithoutPositions: uniqueArray(skippedRounds.map((round) => round.matchChecksum)).length,
    skippedMatchChecksums: uniqueArray(skippedRounds.map((round) => round.matchChecksum)),
    skippedRoundCount: skippedRounds.length,
    heGrenadePoints,
    ctAwpHeatmapPoints,
    fireGrenadePoints: [],
    smokeGrenadePoints: [],
    flashGrenadePoints: [],
    tHeatmapPoints: [],
    killPoints: [],
    deathPoints: [],
    ctHeatmapPoints,
  };
}
