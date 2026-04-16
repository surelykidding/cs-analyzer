import React, { type ReactNode, useEffect, useState } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { DEFAULT_MAX_CONCURRENT_TACTICS_POSITION_GENERATIONS } from 'csdm/common/analyses';
import { runTasksWithConcurrency } from 'csdm/common/run-tasks-with-concurrency';
import { EconomyType, Game, TeamNumber, DemoSource } from 'csdm/common/types/counter-strike';
import {
  PerfectWorldScoutingTargetStatus,
  type PerfectWorldScoutingSession,
  type PerfectWorldScoutingTacticsResponse,
} from 'csdm/common/types/perfect-world-scouting';
import { Status } from 'csdm/common/types/status';
import {
  DEFAULT_TACTICS_CT_WINDOW_END_SECONDS,
  DEFAULT_TACTICS_CT_WINDOW_START_SECONDS,
  DEFAULT_TACTICS_T_WINDOW_END_SECONDS,
  DEFAULT_TACTICS_T_WINDOW_START_SECONDS,
  TACTICS_POSITIONS_WINDOW_MAX_SECONDS,
  TACTICS_POSITIONS_WINDOW_MIN_SECONDS,
} from 'csdm/common/types/team-tactics';
import { Button, ButtonVariant } from 'csdm/ui/components/buttons/button';
import { SpinnableButton } from 'csdm/ui/components/buttons/spinnable-button';
import { Content } from 'csdm/ui/components/content';
import { ErrorMessage } from 'csdm/ui/components/error-message';
import { HeatmapFilters } from 'csdm/ui/components/heatmap/heatmap-filters';
import { TextInput } from 'csdm/ui/components/inputs/text-input';
import { InputLabel } from 'csdm/ui/components/inputs/input-label';
import { SecondsInput } from 'csdm/ui/components/inputs/seconds-input';
import { Select, type SelectOption } from 'csdm/ui/components/inputs/select';
import { RadarLevelSelect } from 'csdm/ui/components/inputs/select/radar-level-select';
import { Message } from 'csdm/ui/components/message';
import { useShowToast } from 'csdm/ui/components/toasts/use-show-toast';
import { OpenLinkButton } from 'csdm/ui/components/buttons/open-link-button';
import { useWebSocketClient } from 'csdm/ui/hooks/use-web-socket-client';
import { useMaps } from 'csdm/ui/maps/use-maps';
import { RadarLevel } from 'csdm/ui/maps/radar-level';
import { RendererClientMessageName } from 'csdm/server/renderer-client-message-name';
import { RendererServerMessageName } from 'csdm/server/renderer-server-message-name';
import { useSettings } from 'csdm/ui/settings/use-settings';
import { useDownloadFolderPath } from 'csdm/ui/settings/downloads/use-download-folder-path';
import { useTranslateEconomyType } from 'csdm/ui/match/economy/team-economy-breakdown/use-translate-economy-type';
import { TeamTacticsMap } from 'csdm/ui/team/tactics/team-tactics-map';
import { DownloadsFolderRequired } from '../downloads-folder-required';
import { PerfectWorldErrorCode } from 'csdm/common/types/perfect-world-errors';
import { getPerfectWorldErrorMessage } from './get-perfect-world-error-message';
import { useCurrentPerfectWorldAccount } from './use-current-perfect-world-account';
import { NoPerfectWorldAccount } from './no-perfect-world-account';
import { useRefreshPerfectWorldAccounts } from './use-refresh-perfect-world-accounts';

const sideOptions: SelectOption<TeamNumber>[] = [
  { label: 'T', value: TeamNumber.T },
  { label: 'CT', value: TeamNumber.CT },
];

function TargetStatusBadge({ status }: { status: PerfectWorldScoutingSession['targets'][number]['status'] }) {
  const className =
    status === PerfectWorldScoutingTargetStatus.Ready
      ? 'bg-green-100 text-green-900'
      : status === PerfectWorldScoutingTargetStatus.Processing || status === PerfectWorldScoutingTargetStatus.Downloading
        ? 'bg-blue-100 text-blue-900'
        : status === PerfectWorldScoutingTargetStatus.Error
          ? 'bg-red-100 text-red-900'
          : 'bg-gray-200 text-gray-900';

  return <span className={`rounded-999 px-8 py-4 text-caption ${className}`}>{status}</span>;
}

export function PerfectWorldScouting() {
  const { t } = useLingui();
  const client = useWebSocketClient();
  const showToast = useShowToast();
  const { translateEconomyType } = useTranslateEconomyType();
  const currentAccount = useCurrentPerfectWorldAccount();
  const refreshAccounts = useRefreshPerfectWorldAccounts();
  const downloadFolderPath = useDownloadFolderPath();
  const settings = useSettings();
  const maps = useMaps();
  const [matchId, setMatchId] = useState('');
  const [participantSteamId, setParticipantSteamId] = useState('');
  const [session, setSession] = useState<PerfectWorldScoutingSession | undefined>(undefined);
  const [sessionStatus, setSessionStatus] = useState<Status>(Status.Loading);
  const [tacticsStatus, setTacticsStatus] = useState<Status>(Status.Idle);
  const [errorMessage, setErrorMessage] = useState<ReactNode | undefined>(undefined);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  const [isGeneratingPositions, setIsGeneratingPositions] = useState(false);
  const [response, setResponse] = useState<PerfectWorldScoutingTacticsResponse | undefined>(undefined);
  const [side, setSide] = useState<TeamNumber>(TeamNumber.T);
  const [economyType, setEconomyType] = useState<EconomyType>(EconomyType.Pistol);
  const [radarLevel, setRadarLevel] = useState<RadarLevel>(RadarLevel.Upper);
  const [tWindowStartSeconds, setTWindowStartSeconds] = useState(DEFAULT_TACTICS_T_WINDOW_START_SECONDS);
  const [tWindowEndSeconds, setTWindowEndSeconds] = useState(DEFAULT_TACTICS_T_WINDOW_END_SECONDS);
  const [ctWindowStartSeconds, setCtWindowStartSeconds] = useState(DEFAULT_TACTICS_CT_WINDOW_START_SECONDS);
  const [ctWindowEndSeconds, setCtWindowEndSeconds] = useState(DEFAULT_TACTICS_CT_WINDOW_END_SECONDS);
  const [refreshToken, setRefreshToken] = useState(0);
  const maxConcurrentTacticsPositionGenerations =
    settings.analyze.maxConcurrentTacticsPositionGenerations ?? DEFAULT_MAX_CONCURRENT_TACTICS_POSITION_GENERATIONS;
  const map = maps.find((map) => map.name === session?.sourceMatch.mapName && map.game === Game.CS2);
  const thresholdZ = map?.lowerRadarFilePath ? map.thresholdZ : null;
  const windowStartSeconds = side === TeamNumber.CT ? ctWindowStartSeconds : tWindowStartSeconds;
  const windowEndSeconds = side === TeamNumber.CT ? ctWindowEndSeconds : tWindowEndSeconds;
  const economyOptions: SelectOption<EconomyType>[] = [
    EconomyType.Pistol,
    EconomyType.Eco,
    EconomyType.Semi,
    EconomyType.ForceBuy,
    EconomyType.Full,
  ].map((economyType) => {
    return {
      value: economyType,
      label: translateEconomyType(economyType),
    };
  });

  const loadSession = async () => {
    try {
      setSessionStatus(Status.Loading);
      setErrorMessage(undefined);
      const currentSession = await client.send({
        name: RendererClientMessageName.FetchCurrentPerfectWorldScoutingSession,
      });
      setSession(currentSession);
      setSessionStatus(Status.Success);
    } catch (error) {
      setSessionStatus(Status.Error);
      setErrorMessage(typeof error === 'string' ? error : t`An error occurred while loading the scouting session.`);
    }
  };

  useEffect(() => {
    void loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onSessionUpdated = (nextSession: PerfectWorldScoutingSession | undefined) => {
      setSession(nextSession);
      setSessionStatus(Status.Success);
    };

    client.on(RendererServerMessageName.PerfectWorldScoutingSessionUpdated, onSessionUpdated);

    return () => {
      client.off(RendererServerMessageName.PerfectWorldScoutingSessionUpdated, onSessionUpdated);
    };
  }, [client]);

  useEffect(() => {
    if (session === undefined || session.readyTargetCount === 0 || map === undefined) {
      setResponse(undefined);
      if (tacticsStatus !== Status.Idle) {
        setTacticsStatus(Status.Idle);
      }
      return;
    }

    let isCancelled = false;

    const fetchTactics = async () => {
      try {
        setTacticsStatus(Status.Loading);
        const tactics = await client.send({
          name: RendererClientMessageName.FetchPerfectWorldScoutingTactics,
          payload: {
            sessionId: session.id,
            side,
            economyType,
            ctWindowStartSeconds: windowStartSeconds,
            ctWindowEndSeconds: windowEndSeconds,
            radarLevel,
            thresholdZ,
          },
        });
        if (!isCancelled) {
          setResponse(tactics);
          setTacticsStatus(Status.Success);
        }
      } catch {
        if (isCancelled) {
          return;
        }

        setTacticsStatus(Status.Error);
        showToast({
          id: 'perfect-world-scouting-tactics-error',
          type: 'error',
          content: <Trans>An error occurred while loading scouting tactics.</Trans>,
        });
      }
    };

    void fetchTactics();

    return () => {
      isCancelled = true;
    };
  }, [
    client,
    economyType,
    map,
    radarLevel,
    refreshToken,
    session,
    showToast,
    side,
    thresholdZ,
    windowEndSeconds,
    windowStartSeconds,
  ]);

  const startSession = async () => {
    try {
      setIsStartingSession(true);
      setErrorMessage(undefined);
      const nextSession = await client.send({
        name: RendererClientMessageName.StartPerfectWorldScoutingSession,
        payload: {
          matchId,
          participantSteamId: participantSteamId.trim() === '' ? undefined : participantSteamId.trim(),
        },
      });
      setSession(nextSession);
      setMatchId('');
      setParticipantSteamId('');
      showToast({
        id: 'perfect-world-scouting-session-started',
        type: 'success',
        content: <Trans>Perfect World scouting session started.</Trans>,
      });
    } catch (error) {
      if (error === PerfectWorldErrorCode.AccountExpired) {
        try {
          await refreshAccounts();
        } catch {
          // Ignore follow-up refresh errors and keep the original failure.
        }
      }

      setErrorMessage(
        typeof error === 'string'
          ? (getPerfectWorldErrorMessage(error) ?? error)
          : t`An error occurred while starting the scouting session.`,
      );
    } finally {
      setIsStartingSession(false);
    }
  };

  const deleteSession = async () => {
    if (session === undefined) {
      return;
    }

    try {
      setIsDeletingSession(true);
      await client.send({
        name: RendererClientMessageName.DeletePerfectWorldScoutingSession,
        payload: {
          sessionId: session.id,
        },
      });
      setSession(undefined);
      setResponse(undefined);
      showToast({
        id: 'perfect-world-scouting-session-deleted',
        type: 'success',
        content: <Trans>Perfect World scouting session deleted.</Trans>,
      });
    } catch (error) {
      showToast({
        id: 'perfect-world-scouting-session-delete-error',
        type: 'error',
        content: typeof error === 'string' ? error : <Trans>An error occurred while deleting the scouting session.</Trans>,
      });
    } finally {
      setIsDeletingSession(false);
    }
  };

  const generatePositionsForSkippedMatches = async () => {
    if (session === undefined || response === undefined || response.skippedMatchChecksums.length === 0) {
      return;
    }

    const skippedChecksums = response.skippedMatchChecksums;
    const skippedTargets = session.targets.filter((target) => {
      return (
        target.demoChecksum !== null &&
        target.demoFilePath !== null &&
        skippedChecksums.includes(target.demoChecksum)
      );
    });
    if (skippedTargets.length === 0) {
      return;
    }

    const onInsertingPositions = () => {
      setIsGeneratingPositions(true);
    };

    try {
      setIsGeneratingPositions(true);
      client.on(RendererServerMessageName.InsertingMatchTacticsPositions, onInsertingPositions);

      await runTasksWithConcurrency({
        items: skippedTargets,
        concurrency: maxConcurrentTacticsPositionGenerations,
        runTask: async (target) => {
          await client.send({
            name: RendererClientMessageName.GenerateMatchTacticsPositions,
            payload: {
              checksum: target.demoChecksum ?? '',
              demoPath: target.demoFilePath ?? '',
              source: DemoSource.PerfectWorld,
            },
          });
        },
      });

      setRefreshToken((value) => value + 1);
      showToast({
        id: 'perfect-world-scouting-positions-generated',
        type: 'success',
        content: <Trans>Tactics positions generated for imported scouting demos.</Trans>,
      });
    } catch {
      showToast({
        id: 'perfect-world-scouting-positions-generated-error',
        type: 'error',
        content: <Trans>An error occurred while generating tactics positions.</Trans>,
      });
    } finally {
      client.off(RendererServerMessageName.InsertingMatchTacticsPositions, onInsertingPositions);
      setIsGeneratingPositions(false);
    }
  };

  if (downloadFolderPath === undefined || downloadFolderPath === '') {
    return <DownloadsFolderRequired />;
  }

  if (currentAccount === undefined) {
    return <NoPerfectWorldAccount />;
  }

  if (!currentAccount.isValid && session === undefined) {
    return <NoPerfectWorldAccount status="stale" currentAccount={currentAccount} />;
  }

  if (sessionStatus === Status.Loading && session === undefined) {
    return <Message message={<Trans>Loading Perfect World scouting...</Trans>} />;
  }

  if (sessionStatus === Status.Error && session === undefined) {
    return (
      <Content>
        <div className="max-w-[720px]">
          <ErrorMessage message={errorMessage || <Trans>An error occurred while loading the scouting session.</Trans>} />
        </div>
      </Content>
    );
  }

  return (
    <Content>
      <div className="flex h-full gap-16">
        <HeatmapFilters>
          <div className="rounded-8 border border-gray-300 bg-gray-50 p-12">
            <p className="text-body-strong">
              <Trans>Perfect World Scouting</Trans>
            </p>
            <p className="mt-8 text-caption text-gray-800">
              <Trans>
                Paste a Perfect World match ID to find the opponent&apos;s recent matches on the same map. Matching demos
                are downloaded, imported and analyzed automatically.
              </Trans>
            </p>
            <p className="mt-8 text-caption text-gray-800">
              <Trans>Current Perfect World account: {currentAccount.nickname}</Trans>
            </p>
            <p className="mt-4 text-caption text-gray-800">
              <Trans>Status: {currentAccount.isValid ? 'active' : 'stale'}</Trans>
            </p>
            <p className="mt-4 text-caption text-gray-800">
              <Trans>The desktop client does not need to stay open after the account session has been imported.</Trans>
            </p>
          </div>

          {session === undefined ? (
            <div className="rounded-8 border border-gray-300 bg-gray-50 p-12">
              <TextInput
                label={<Trans context="Input label">Perfect World match ID</Trans>}
                value={matchId}
                onChange={(event) => {
                  setMatchId(event.target.value);
                }}
                placeholder={t({
                  message: 'PVP@1234567890 or 1234567890',
                  context: 'Input placeholder',
                })}
                onEnterKeyDown={startSession}
              />
              <div className="mt-12">
                <TextInput
                  label={<Trans context="Input label">Participant Steam ID (required for ongoing matches)</Trans>}
                  value={participantSteamId}
                  onChange={(event) => {
                    setParticipantSteamId(event.target.value);
                  }}
                  placeholder={t({
                    message: 'Required when public match detail is unavailable for an ongoing room',
                    context: 'Input placeholder',
                  })}
                  onEnterKeyDown={startSession}
                />
              </div>
              <div className="mt-12 flex gap-8">
                <SpinnableButton isLoading={isStartingSession} isDisabled={matchId.trim() === ''} onClick={startSession}>
                  <Trans>Start scouting session</Trans>
                </SpinnableButton>
                <Button onClick={loadSession}>
                  <Trans>Refresh</Trans>
                </Button>
              </div>
              {errorMessage !== undefined && (
                <div className="mt-12">
                  <ErrorMessage message={errorMessage} />
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="rounded-8 border border-gray-300 bg-gray-50 p-12">
                <p className="text-body-strong">
                  <Trans>Source Match</Trans>
                </p>
                <p className="mt-8 text-caption text-gray-800">
                  <Trans>Map: {session.sourceMatch.mapName}</Trans>
                </p>
                <p className="mt-4 text-caption text-gray-800">
                  <Trans>
                    {session.sourceMatch.ourTeamName} {session.sourceMatch.ourTeamScore} - {session.sourceMatch.opponentTeamScore}{' '}
                    {session.sourceMatch.opponentTeamName}
                  </Trans>
                </p>
                <p className="mt-4 text-caption text-gray-800">
                  <Trans>Status: {session.status}</Trans>
                </p>
                {session.errorMessage && (
                  <div className="mt-8">
                    <ErrorMessage message={session.errorMessage} />
                  </div>
                )}
                <div className="mt-12 flex flex-wrap gap-8">
                  {session.sourceMatch.url && (
                    <OpenLinkButton url={session.sourceMatch.url}>
                      <Trans>See source room</Trans>
                    </OpenLinkButton>
                  )}
                  <Button onClick={loadSession}>
                    <Trans>Refresh session</Trans>
                  </Button>
                  <SpinnableButton isLoading={isDeletingSession} variant={ButtonVariant.Danger} onClick={deleteSession}>
                    <Trans>Delete scouting session</Trans>
                  </SpinnableButton>
                </div>
              </div>

              <div className="rounded-8 border border-gray-300 bg-gray-50 p-12 text-caption text-gray-800">
                <p>
                  <Trans>Targets ready: {session.readyTargetCount}</Trans>
                </p>
                <p>
                  <Trans>Targets waiting for download: {session.awaitingDownloadTargetCount}</Trans>
                </p>
                <p>
                  <Trans>Targets downloading: {session.downloadingTargetCount}</Trans>
                </p>
                <p>
                  <Trans>Targets processing: {session.processingTargetCount}</Trans>
                </p>
                <p>
                  <Trans>Targets with errors: {session.errorTargetCount}</Trans>
                </p>
              </div>

              <div className="flex flex-col gap-y-8">
                <InputLabel>
                  <Trans context="Input label">Side</Trans>
                </InputLabel>
                <Select options={sideOptions} value={side} onChange={setSide} />
              </div>
              <div className="flex flex-col gap-y-8">
                <InputLabel>
                  <Trans context="Input label">Economy</Trans>
                </InputLabel>
                <Select options={economyOptions} value={economyType} onChange={setEconomyType} />
              </div>
              <div className="flex items-end gap-12">
                <SecondsInput
                  label={<Trans context="Input label">Window start</Trans>}
                  min={TACTICS_POSITIONS_WINDOW_MIN_SECONDS}
                  max={TACTICS_POSITIONS_WINDOW_MAX_SECONDS}
                  value={windowStartSeconds}
                  onChange={(value) => {
                    if (side === TeamNumber.CT) {
                      setCtWindowStartSeconds(
                        Math.max(TACTICS_POSITIONS_WINDOW_MIN_SECONDS, Math.min(value, ctWindowEndSeconds - 1)),
                      );
                      return;
                    }

                    setTWindowStartSeconds(
                      Math.max(TACTICS_POSITIONS_WINDOW_MIN_SECONDS, Math.min(value, tWindowEndSeconds - 1)),
                    );
                  }}
                />
                <SecondsInput
                  label={<Trans context="Input label">Window end</Trans>}
                  min={TACTICS_POSITIONS_WINDOW_MIN_SECONDS}
                  max={TACTICS_POSITIONS_WINDOW_MAX_SECONDS}
                  value={windowEndSeconds}
                  onChange={(value) => {
                    if (side === TeamNumber.CT) {
                      setCtWindowEndSeconds(
                        Math.min(TACTICS_POSITIONS_WINDOW_MAX_SECONDS, Math.max(value, ctWindowStartSeconds + 1)),
                      );
                      return;
                    }

                    setTWindowEndSeconds(
                      Math.min(TACTICS_POSITIONS_WINDOW_MAX_SECONDS, Math.max(value, tWindowStartSeconds + 1)),
                    );
                  }}
                />
              </div>
              <RadarLevelSelect
                game={Game.CS2}
                mapName={session.sourceMatch.mapName}
                onChange={setRadarLevel}
                selectedRadarLevel={radarLevel}
              />

              {response !== undefined && response.skippedMatchesWithoutPositions > 0 && (
                <div className="rounded-8 border border-gray-300 bg-gray-50 p-12">
                  <p className="text-caption text-gray-800">
                    <Trans>
                      Some imported matches are still missing player positions required for the tactics heatmap.
                    </Trans>
                  </p>
                  <div className="mt-12">
                    <SpinnableButton isLoading={isGeneratingPositions} onClick={generatePositionsForSkippedMatches}>
                      <Trans>Generate tactics positions for imported demos</Trans>
                    </SpinnableButton>
                  </div>
                </div>
              )}

              <div className="min-h-0 rounded-8 border border-gray-300 bg-gray-50 p-12">
                <p className="text-body-strong">
                  <Trans>Targets</Trans>
                </p>
                <div className="mt-12 flex max-h-[320px] flex-col gap-y-8 overflow-auto">
                  {session.targets.map((target) => {
                    return (
                      <div key={target.id} className="rounded-8 border border-gray-300 bg-white p-12">
                        <div className="flex items-start justify-between gap-12">
                          <div className="min-w-0">
                            <p className="text-body-strong">
                              <Trans>Match {target.order + 1}</Trans>
                            </p>
                            <p className="mt-4 break-all text-caption text-gray-800">{target.perfectWorldMatchId}</p>
                          </div>
                          <TargetStatusBadge status={target.status} />
                        </div>
                        <p className="mt-8 text-caption text-gray-800">
                          <Trans>
                            Shared history players: {target.sharedHistoryPlayerCount}, roster overlap: {target.rosterOverlapCount}
                          </Trans>
                        </p>
                        {target.failureMessage && (
                          <div className="mt-8">
                            <ErrorMessage message={target.failureMessage} />
                          </div>
                        )}
                        {target.demoFilePath && (
                          <p className="mt-8 break-all text-caption text-gray-800">{target.demoFilePath}</p>
                        )}
                        {target.url && (
                          <div className="mt-12 flex flex-wrap gap-8">
                            <OpenLinkButton url={target.url}>
                              <Trans>See source room</Trans>
                            </OpenLinkButton>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </HeatmapFilters>

        <div className="flex min-h-0 flex-1 flex-col gap-y-16">
          {session === undefined ? (
            <Message message={<Trans>Start a scouting session to see opponent tactics.</Trans>} />
          ) : session.readyTargetCount === 0 ? (
            <Message message={<Trans>Opponent demos are being downloaded, imported and analyzed automatically.</Trans>} />
          ) : tacticsStatus === Status.Loading && response === undefined ? (
            <Message message={<Trans>Loading scouting tactics...</Trans>} />
          ) : tacticsStatus === Status.Error && response === undefined ? (
            <Message message={<Trans>An error occurred while loading scouting tactics.</Trans>} />
          ) : side === TeamNumber.T ? (
            <div className="grid min-h-0 flex-1 gap-16 xl:grid-cols-2 2xl:grid-cols-3">
              <TeamTacticsMap
                title={<Trans>Fire Grenades</Trans>}
                game={Game.CS2}
                mapName={session.sourceMatch.mapName}
                radarLevel={radarLevel}
                points={response?.fireGrenadePoints ?? []}
                variant="heatmap"
                heatmapStyle="event"
                emptyMessage={<Trans>No fire grenade data found for the current filters.</Trans>}
              />
              <TeamTacticsMap
                title={<Trans>Smoke Grenades</Trans>}
                game={Game.CS2}
                mapName={session.sourceMatch.mapName}
                radarLevel={radarLevel}
                points={response?.smokeGrenadePoints ?? []}
                variant="heatmap"
                heatmapStyle="event"
                emptyMessage={<Trans>No smoke grenade data found for the current filters.</Trans>}
              />
              <TeamTacticsMap
                title={<Trans>Flashbangs</Trans>}
                game={Game.CS2}
                mapName={session.sourceMatch.mapName}
                radarLevel={radarLevel}
                points={response?.flashGrenadePoints ?? []}
                variant="heatmap"
                heatmapStyle="event"
                emptyMessage={<Trans>No flashbang data found for the current filters.</Trans>}
              />
              <TeamTacticsMap
                title={<Trans>T Heatmap</Trans>}
                game={Game.CS2}
                mapName={session.sourceMatch.mapName}
                radarLevel={radarLevel}
                points={response?.tHeatmapPoints ?? []}
                variant="heatmap"
                emptyMessage={<Trans>No T position data found for the current filters.</Trans>}
              />
              <TeamTacticsMap
                title={<Trans>Kill Positions</Trans>}
                game={Game.CS2}
                mapName={session.sourceMatch.mapName}
                radarLevel={radarLevel}
                points={response?.killPoints ?? []}
                variant="heatmap"
                heatmapStyle="event"
                emptyMessage={<Trans>No kill data found for the current filters.</Trans>}
              />
              <TeamTacticsMap
                title={<Trans>Death Positions</Trans>}
                game={Game.CS2}
                mapName={session.sourceMatch.mapName}
                radarLevel={radarLevel}
                points={response?.deathPoints ?? []}
                variant="heatmap"
                heatmapStyle="event"
                emptyMessage={<Trans>No death data found for the current filters.</Trans>}
              />
            </div>
          ) : (
            <div className="grid min-h-0 flex-1 gap-16 xl:grid-cols-3">
              <TeamTacticsMap
                title={<Trans>HE Grenades</Trans>}
                game={Game.CS2}
                mapName={session.sourceMatch.mapName}
                radarLevel={radarLevel}
                points={response?.heGrenadePoints ?? []}
                variant="heatmap"
                heatmapStyle="event"
                emptyMessage={<Trans>No HE grenade data found for the current filters.</Trans>}
              />
              <TeamTacticsMap
                title={<Trans>AWP Holder Heatmap</Trans>}
                game={Game.CS2}
                mapName={session.sourceMatch.mapName}
                radarLevel={radarLevel}
                points={response?.ctAwpHeatmapPoints ?? []}
                variant="heatmap"
                emptyMessage={<Trans>No AWP holder position data found for the current filters.</Trans>}
              />
              <TeamTacticsMap
                title={<Trans>CT Heatmap</Trans>}
                game={Game.CS2}
                mapName={session.sourceMatch.mapName}
                radarLevel={radarLevel}
                points={response?.ctHeatmapPoints ?? []}
                variant="heatmap"
                emptyMessage={<Trans>No CT position data found for the current filters.</Trans>}
              />
            </div>
          )}
        </div>
      </div>
    </Content>
  );
}
