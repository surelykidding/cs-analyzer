import type { PerfectWorldAccount } from 'csdm/common/types/perfect-world-account';
import { PerfectWorldErrorCode } from 'csdm/common/types/perfect-world-errors';
import type { PerfectWorldMatch } from 'csdm/common/types/perfect-world-match';
import { getSettings } from 'csdm/node/settings/get-settings';
import { getDownloadStatus } from 'csdm/node/download/get-download-status';
import { fetchPerfectWorldLiveMatchPayload, fetchPerfectWorldPublicMatchDetail } from './perfect-world-api';
import { createPerfectWorldMatchSeed, mergePerfectWorldMatchSeeds } from './perfect-world-match-mappers';
import { fetchPerfectWorldMatchHistoryMatches } from './fetch-last-perfect-world-matches';
import { buildPerfectWorldMatchId, normalizePerfectWorldComparableMatchId } from './extract-perfect-world-match-id';

function hasResolvedSourceData(match: { mapName?: string; teams?: Array<{ playerSteamIds: string[] }> } | undefined) {
  if (match === undefined) {
    return false;
  }

  return (match.mapName ?? '') !== '' && (match.teams ?? []).some((team) => team.playerSteamIds.length > 0);
}

export async function fetchPerfectWorldMatch(
  matchId: string,
  currentAccount: PerfectWorldAccount,
  liveSteamId?: string,
): Promise<PerfectWorldMatch> {
  const normalizedMatchId = normalizePerfectWorldComparableMatchId(matchId);
  const trimmedLiveSteamId = liveSteamId?.trim();
  if (normalizedMatchId === '') {
    throw new Error('Invalid Perfect World match ID.');
  }

  const [rawDetail, currentAccountMatches, settings] = await Promise.all([
    fetchPerfectWorldPublicMatchDetail({
      userId: currentAccount.userId,
      matchId: normalizedMatchId,
    }).catch(() => undefined),
    fetchPerfectWorldMatchHistoryMatches({
      auth: {
        token: currentAccount.token,
        mySteamId: currentAccount.steamId,
        userId: currentAccount.userId,
      },
      toSteamId: currentAccount.steamId,
      page: 1,
      pageSize: 100,
    }).catch(() => []),
    getSettings(),
  ]);

  const historyMatch = currentAccountMatches.find((match) => {
    return normalizePerfectWorldComparableMatchId(match.id) === normalizedMatchId;
  });
  const detailSeed = rawDetail ? createPerfectWorldMatchSeed(rawDetail, normalizedMatchId) : undefined;
  const shouldFetchLivePayload = !hasResolvedSourceData(detailSeed) && !hasResolvedSourceData(historyMatch);
  let livePayload: Awaited<ReturnType<typeof fetchPerfectWorldLiveMatchPayload>> | undefined;
  if (shouldFetchLivePayload) {
    if (trimmedLiveSteamId === undefined || trimmedLiveSteamId === '') {
      throw PerfectWorldErrorCode.ParticipantSteamIdRequired;
    }

    livePayload = await fetchPerfectWorldLiveMatchPayload({
      steamId: trimmedLiveSteamId,
      expectedMatchId: normalizedMatchId,
    });

    if (livePayload === undefined) {
      throw PerfectWorldErrorCode.ParticipantSteamIdNotInRoom;
    }
  }
  const liveSeed =
    livePayload === undefined
      ? undefined
      : {
          ...createPerfectWorldMatchSeed(livePayload, normalizedMatchId),
          demoUrl: '',
        };
  const historySeed = historyMatch
    ? {
        ...historyMatch,
      }
    : undefined;
  const mergedMatch = mergePerfectWorldMatchSeeds(
    {
      id: buildPerfectWorldMatchId(normalizedMatchId),
      game: historyMatch?.game,
      date: historyMatch?.date,
      durationInSeconds: historyMatch?.durationInSeconds,
      demoUrl: historyMatch?.demoUrl,
      mapName: historyMatch?.mapName,
      url: historyMatch?.url,
      cupId: historyMatch?.cupId,
      dataSource: historyMatch?.dataSource,
      mode: historyMatch?.mode,
      players: historyMatch?.players,
      teams: historyMatch?.teams,
    },
    liveSeed ?? {},
    detailSeed ?? {},
    historySeed ?? {},
  );

  if (mergedMatch.mapName === '') {
    throw new Error('Could not resolve the map name for this Perfect World match.');
  }

  return {
    ...mergedMatch,
    downloadStatus: await getDownloadStatus(settings.download.folderPath, mergedMatch.id, mergedMatch.demoUrl),
  };
}
