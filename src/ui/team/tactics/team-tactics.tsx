import React, { useEffect, useRef, useState } from 'react';
import { Trans } from '@lingui/react/macro';
import { uniqueArray } from 'csdm/common/array/unique-array';
import { DEFAULT_MAX_CONCURRENT_TACTICS_POSITION_GENERATIONS } from 'csdm/common/analyses';
import { ErrorCode } from 'csdm/common/error-code';
import { runTasksWithConcurrency } from 'csdm/common/run-tasks-with-concurrency';
import { EconomyType, Game, TeamNumber } from 'csdm/common/types/counter-strike';
import { Status } from 'csdm/common/types/status';
import {
  DEFAULT_TACTICS_WINDOW_END_SECONDS,
  DEFAULT_TACTICS_WINDOW_START_SECONDS,
  TACTICS_POSITIONS_WINDOW_MAX_SECONDS,
  TACTICS_POSITIONS_WINDOW_MIN_SECONDS,
  type TeamTacticsResponse,
  type TeamTacticsPayload,
} from 'csdm/common/types/team-tactics';
import { Content } from 'csdm/ui/components/content';
import { Message } from 'csdm/ui/components/message';
import { SpinnableButton } from 'csdm/ui/components/buttons/spinnable-button';
import { useShowToast } from 'csdm/ui/components/toasts/use-show-toast';
import { useWebSocketClient } from 'csdm/ui/hooks/use-web-socket-client';
import { useMaps } from 'csdm/ui/maps/use-maps';
import { RadarLevel } from 'csdm/ui/maps/radar-level';
import { RendererServerMessageName } from 'csdm/server/renderer-server-message-name';
import { RendererClientMessageName } from 'csdm/server/renderer-client-message-name';
import { useSettings } from 'csdm/ui/settings/use-settings';
import { useCurrentTeamName } from '../use-current-team-name';
import { useTeam } from '../use-team';
import { TeamTacticsFilters } from './team-tactics-filters';
import { TeamTacticsMap } from './team-tactics-map';

export function TeamTactics() {
  const ctWindowMinSeconds = TACTICS_POSITIONS_WINDOW_MIN_SECONDS;
  const ctWindowMaxSeconds = TACTICS_POSITIONS_WINDOW_MAX_SECONDS;
  const client = useWebSocketClient();
  const showToast = useShowToast();
  const maps = useMaps();
  const settings = useSettings();
  const team = useTeam();
  const teamName = useCurrentTeamName();
  const defaultTacticsWindowStartSeconds =
    settings.analyze.defaultTacticsWindowStartSeconds ?? DEFAULT_TACTICS_WINDOW_START_SECONDS;
  const defaultTacticsWindowEndSeconds =
    settings.analyze.defaultTacticsWindowEndSeconds ?? DEFAULT_TACTICS_WINDOW_END_SECONDS;
  const [mapName, setMapName] = useState('');
  const [side, setSide] = useState<TeamNumber>(TeamNumber.T);
  const [economyType, setEconomyType] = useState<EconomyType>(EconomyType.Pistol);
  const [tWindowStartSeconds, setTWindowStartSeconds] = useState(defaultTacticsWindowStartSeconds);
  const [tWindowEndSeconds, setTWindowEndSeconds] = useState(defaultTacticsWindowEndSeconds);
  const [ctWindowStartSeconds, setCtWindowStartSeconds] = useState(defaultTacticsWindowStartSeconds);
  const [ctWindowEndSeconds, setCtWindowEndSeconds] = useState(defaultTacticsWindowEndSeconds);
  const [radarLevel, setRadarLevel] = useState<RadarLevel>(RadarLevel.Upper);
  const [status, setStatus] = useState<Status>(Status.Idle);
  const [response, setResponse] = useState<TeamTacticsResponse | undefined>(undefined);
  const [isGeneratingPositions, setIsGeneratingPositions] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const autoSwitchedRadarLevelKeyRef = useRef<string | null>(null);

  const cs2Matches = React.useMemo(() => {
    return team.matches.filter((match) => {
      return match.game === Game.CS2;
    });
  }, [team.matches]);
  const mapNames = React.useMemo(() => {
    return uniqueArray(cs2Matches.map((match) => match.mapName)).sort((mapA, mapB) => mapA.localeCompare(mapB));
  }, [cs2Matches]);
  const matchChecksumsKey = React.useMemo(() => {
    return cs2Matches
      .map((match) => match.checksum)
      .sort()
      .join(',');
  }, [cs2Matches]);
  const stableMatchChecksums = React.useMemo(() => {
    return matchChecksumsKey === '' ? [] : matchChecksumsKey.split(',');
  }, [matchChecksumsKey]);
  const skippedMatchesWithoutPositions = response?.skippedMatchesWithoutPositions ?? 0;
  const map = maps.find((map) => map.name === mapName && map.game === Game.CS2);
  const thresholdZ = map?.lowerRadarFilePath ? map.thresholdZ : null;
  const windowStartSeconds = side === TeamNumber.CT ? ctWindowStartSeconds : tWindowStartSeconds;
  const windowEndSeconds = side === TeamNumber.CT ? ctWindowEndSeconds : tWindowEndSeconds;
  const ctRadarAutoSwitchKey = `${mapName}|${side}|${windowStartSeconds}|${windowEndSeconds}`;
  const maxConcurrentTacticsPositionGenerations =
    settings.analyze.maxConcurrentTacticsPositionGenerations ?? DEFAULT_MAX_CONCURRENT_TACTICS_POSITION_GENERATIONS;
  const setWindowStartSecondsSafe = (seconds: number) => {
    if (side === TeamNumber.CT) {
      setCtWindowStartSeconds(Math.max(ctWindowMinSeconds, Math.min(seconds, ctWindowEndSeconds - 1)));
      return;
    }

    setTWindowStartSeconds(Math.max(ctWindowMinSeconds, Math.min(seconds, tWindowEndSeconds - 1)));
  };
  const setWindowEndSecondsSafe = (seconds: number) => {
    if (side === TeamNumber.CT) {
      setCtWindowEndSeconds(Math.min(ctWindowMaxSeconds, Math.max(seconds, ctWindowStartSeconds + 1)));
      return;
    }

    setTWindowEndSeconds(Math.min(ctWindowMaxSeconds, Math.max(seconds, tWindowStartSeconds + 1)));
  };

  useEffect(() => {
    if (mapNames.length === 0) {
      if (mapName !== '') {
        setMapName('');
      }
      if (response !== undefined) {
        setResponse(undefined);
      }
      if (status !== Status.Idle) {
        setStatus(Status.Idle);
      }
      return;
    }

    if (!mapNames.includes(mapName)) {
      setMapName(mapNames[0]);
      setRadarLevel(RadarLevel.Upper);
    }
  }, [mapName, mapNames, response, status]);

  useEffect(() => {
    if (stableMatchChecksums.length === 0 || mapName === '' || map === undefined) {
      return;
    }

    let isCancelled = false;

    const fetchTactics = async () => {
      try {
        setStatus(Status.Loading);
        const payload: TeamTacticsPayload = {
          teamName,
          matchChecksums: stableMatchChecksums,
          mapName,
          side,
          economyType,
          ctWindowStartSeconds: windowStartSeconds,
          ctWindowEndSeconds: windowEndSeconds,
          radarLevel,
          thresholdZ,
        };
        const response = await client.send({
          name: RendererClientMessageName.FetchTeamTactics,
          payload,
        });

        if (!isCancelled) {
          setResponse(response);
          setStatus(Status.Success);
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setStatus(Status.Error);
        showToast({
          content: <Trans>An error occurred</Trans>,
          id: 'team-tactics-error',
          type: 'error',
        });
      }
    };

    void fetchTactics();

    return () => {
      isCancelled = true;
    };
  }, [
    client,
    map,
    economyType,
    mapName,
    radarLevel,
    refreshToken,
    showToast,
    side,
    stableMatchChecksums,
    teamName,
    thresholdZ,
    windowEndSeconds,
    windowStartSeconds,
  ]);

  useEffect(() => {
    if (
      side !== TeamNumber.CT ||
      map?.lowerRadarFilePath === undefined ||
      response === undefined ||
      response.ctHeatmapPoints.length > 0 ||
      autoSwitchedRadarLevelKeyRef.current === ctRadarAutoSwitchKey
    ) {
      return;
    }

    autoSwitchedRadarLevelKeyRef.current = ctRadarAutoSwitchKey;
    setRadarLevel((currentRadarLevel) => {
      return currentRadarLevel === RadarLevel.Upper ? RadarLevel.Lower : RadarLevel.Upper;
    });
    showToast({
      content: (
        <Trans>
          No CT position data was found on the current radar level for these filters. Switched to the other level.
        </Trans>
      ),
      id: 'team-tactics-radar-level-auto-switch',
      type: 'info',
    });
  }, [ctRadarAutoSwitchKey, map?.lowerRadarFilePath, response, showToast, side]);

  const generateTacticsPositionsForMatches = async (
    checksums: string[],
    generator: typeof RendererClientMessageName.GenerateMatchTacticsPositions,
    progressMessage: typeof RendererServerMessageName.InsertingMatchTacticsPositions,
    showProgress = true,
  ) => {
    const matches = cs2Matches.filter((match) => {
      return checksums.includes(match.checksum);
    });
    if (matches.length === 0) {
      return false;
    }

    const onInsertingPositions = () => {
      if (showProgress) {
        setIsGeneratingPositions(true);
      }
    };

    try {
      if (showProgress) {
        setIsGeneratingPositions(true);
        client.on(progressMessage, onInsertingPositions);
      }

      await runTasksWithConcurrency({
        items: matches,
        concurrency: maxConcurrentTacticsPositionGenerations,
        runTask: async (match) => {
          await client.send({
            name: generator,
            payload: {
              checksum: match.checksum,
              demoPath: match.demoFilePath,
              source: match.source,
            },
          });
        },
      });

      return true;
    } finally {
      if (showProgress) {
        client.off(progressMessage, onInsertingPositions);
        setIsGeneratingPositions(false);
      }
    }
  };

  const generatePositionsForSkippedMatches = async () => {
    if (response === undefined || response.skippedMatchChecksums.length === 0) {
      return;
    }
    const skippedChecksums = response.skippedMatchChecksums;

    try {
      const hasGenerated = await generateTacticsPositionsForMatches(
        skippedChecksums,
        RendererClientMessageName.GenerateMatchTacticsPositions,
        RendererServerMessageName.InsertingMatchTacticsPositions,
      );
      if (!hasGenerated) {
        return;
      }

      showToast({
        content: <Trans>Tactics positions generated for skipped matches.</Trans>,
        id: 'team-tactics-positions-generated',
        type: 'success',
      });
      setRefreshToken((value) => value + 1);
      setStatus(Status.Loading);
    } catch (error) {
      const isAnalyzerIncompatible = error === ErrorCode.DemoAnalyzerIncompatible;
      showToast({
        content: isAnalyzerIncompatible ? (
          <Trans>
            The bundled demo analyzer is not compatible with tactics analysis. Update the analyzer adapter or reinstall
            a compatible analyzer binary.
          </Trans>
        ) : (
          <Trans>An error occurred while generating tactics positions.</Trans>
        ),
        id: 'team-tactics-generate-positions-error',
        type: 'error',
      });
    }
  };

  if (cs2Matches.length === 0) {
    return (
      <Content>
        <Message message={<Trans>Tactics v1 only supports teams with CS2 matches.</Trans>} />
      </Content>
    );
  }

  return (
    <Content>
      <div className="flex h-full gap-16">
        <TeamTacticsFilters
          ctWindowEndSeconds={windowEndSeconds}
          ctWindowStartSeconds={windowStartSeconds}
          ctWindowMaxSeconds={ctWindowMaxSeconds}
          ctWindowMinSeconds={ctWindowMinSeconds}
          economyType={economyType}
          game={Game.CS2}
          isGeneratingPositions={isGeneratingPositions}
          mapName={mapName}
          mapNames={mapNames}
          onCtWindowEndSecondsChange={setWindowEndSecondsSafe}
          onCtWindowStartSecondsChange={setWindowStartSecondsSafe}
          onEconomyTypeChange={setEconomyType}
          onGeneratePositionsClick={generatePositionsForSkippedMatches}
          onMapNameChange={(mapName) => {
            setMapName(mapName);
            setRadarLevel(RadarLevel.Upper);
          }}
          onRadarLevelChange={setRadarLevel}
          onSideChange={setSide}
          radarLevel={radarLevel}
          response={response}
          side={side}
        />
        <div className="flex min-h-0 flex-1 flex-col gap-y-16">
          {status === Status.Loading && response === undefined ? (
            <Message message={<Trans>Loading tactics...</Trans>} />
          ) : status === Status.Error && response === undefined ? (
            <Message message={<Trans>An error occurred while loading tactics.</Trans>} />
          ) : side === TeamNumber.T ? (
            <div className="grid min-h-0 flex-1 gap-16 xl:grid-cols-2 2xl:grid-cols-3">
              <TeamTacticsMap
                title={<Trans>Fire Grenades</Trans>}
                game={Game.CS2}
                mapName={mapName}
                radarLevel={radarLevel}
                points={response?.fireGrenadePoints ?? []}
                variant="heatmap"
                heatmapStyle="event"
                emptyMessage={<Trans>No fire grenade data found for the current filters.</Trans>}
              />
              <TeamTacticsMap
                title={<Trans>Smoke Grenades</Trans>}
                game={Game.CS2}
                mapName={mapName}
                radarLevel={radarLevel}
                points={response?.smokeGrenadePoints ?? []}
                variant="heatmap"
                heatmapStyle="event"
                emptyMessage={<Trans>No smoke grenade data found for the current filters.</Trans>}
              />
              <TeamTacticsMap
                title={<Trans>Flashbangs</Trans>}
                game={Game.CS2}
                mapName={mapName}
                radarLevel={radarLevel}
                points={response?.flashGrenadePoints ?? []}
                variant="heatmap"
                heatmapStyle="event"
                emptyMessage={<Trans>No flashbang data found for the current filters.</Trans>}
              />
              <TeamTacticsMap
                title={<Trans>T Heatmap</Trans>}
                game={Game.CS2}
                mapName={mapName}
                radarLevel={radarLevel}
                points={response?.tHeatmapPoints ?? []}
                variant="heatmap"
                emptyMessage={<Trans>No T position data found for the current filters.</Trans>}
              />
              <TeamTacticsMap
                title={<Trans>Kill Positions</Trans>}
                game={Game.CS2}
                mapName={mapName}
                radarLevel={radarLevel}
                points={response?.killPoints ?? []}
                variant="heatmap"
                heatmapStyle="event"
                emptyMessage={<Trans>No kill data found for the current filters.</Trans>}
              />
              <TeamTacticsMap
                title={<Trans>Death Positions</Trans>}
                game={Game.CS2}
                mapName={mapName}
                radarLevel={radarLevel}
                points={response?.deathPoints ?? []}
                variant="heatmap"
                heatmapStyle="event"
                emptyMessage={<Trans>No death data found for the current filters.</Trans>}
              />
            </div>
          ) : (
            <>
              {response !== undefined && skippedMatchesWithoutPositions > 0 && (
                <div className="rounded-8 border border-gray-300 bg-gray-50 p-12">
                  <p className="text-body-strong">
                    <Trans>Missing Positions</Trans>
                  </p>
                  <p className="mt-8 text-caption text-gray-800">
                    <Trans>
                      {skippedMatchesWithoutPositions} matches on this map are missing player positions for the tactics
                      heatmap.
                    </Trans>
                  </p>
                  <div className="mt-12">
                    <SpinnableButton isLoading={isGeneratingPositions} onClick={generatePositionsForSkippedMatches}>
                      <Trans>Generate tactics positions for current map matches</Trans>
                    </SpinnableButton>
                  </div>
                </div>
              )}
              <div className="grid min-h-0 flex-1 gap-16 xl:grid-cols-2 2xl:grid-cols-3">
                <TeamTacticsMap
                  title={<Trans>Fire Grenades</Trans>}
                  game={Game.CS2}
                  mapName={mapName}
                  radarLevel={radarLevel}
                  points={response?.fireGrenadePoints ?? []}
                  variant="heatmap"
                  heatmapStyle="event"
                  emptyMessage={<Trans>No fire grenade data found for the current filters.</Trans>}
                />
                <TeamTacticsMap
                  title={<Trans>Smoke Grenades</Trans>}
                  game={Game.CS2}
                  mapName={mapName}
                  radarLevel={radarLevel}
                  points={response?.smokeGrenadePoints ?? []}
                  variant="heatmap"
                  heatmapStyle="event"
                  emptyMessage={<Trans>No smoke grenade data found for the current filters.</Trans>}
                />
                <TeamTacticsMap
                  title={<Trans>Flashbangs</Trans>}
                  game={Game.CS2}
                  mapName={mapName}
                  radarLevel={radarLevel}
                  points={response?.flashGrenadePoints ?? []}
                  variant="heatmap"
                  heatmapStyle="event"
                  emptyMessage={<Trans>No flashbang data found for the current filters.</Trans>}
                />
                <TeamTacticsMap
                  title={<Trans>CT Heatmap</Trans>}
                  game={Game.CS2}
                  mapName={mapName}
                  radarLevel={radarLevel}
                  points={response?.ctHeatmapPoints ?? []}
                  variant="heatmap"
                  emptyMessage={<Trans>No position data found for the current filters.</Trans>}
                />
                <TeamTacticsMap
                  title={<Trans>HE Grenades</Trans>}
                  game={Game.CS2}
                  mapName={mapName}
                  radarLevel={radarLevel}
                  points={response?.heGrenadePoints ?? []}
                  variant="heatmap"
                  heatmapStyle="event"
                  emptyMessage={<Trans>No HE grenade data found for the current filters.</Trans>}
                />
                <TeamTacticsMap
                  title={<Trans>AWP Holder Heatmap</Trans>}
                  game={Game.CS2}
                  mapName={mapName}
                  radarLevel={radarLevel}
                  points={response?.ctAwpHeatmapPoints ?? []}
                  variant="heatmap"
                  emptyMessage={<Trans>No AWP holder position data found for the current filters.</Trans>}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </Content>
  );
}
