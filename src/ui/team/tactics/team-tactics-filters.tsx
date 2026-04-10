import React from 'react';
import { Trans } from '@lingui/react/macro';
import { EconomyType, TeamNumber, type Game } from 'csdm/common/types/counter-strike';
import type { TeamTacticsResponse } from 'csdm/common/types/team-tactics';
import { SpinnableButton } from 'csdm/ui/components/buttons/spinnable-button';
import { HeatmapFilters } from 'csdm/ui/components/heatmap/heatmap-filters';
import { InputLabel } from 'csdm/ui/components/inputs/input-label';
import { SecondsInput } from 'csdm/ui/components/inputs/seconds-input';
import { Select, type SelectOption } from 'csdm/ui/components/inputs/select';
import { RadarLevelSelect } from 'csdm/ui/components/inputs/select/radar-level-select';
import { RadarLevel } from 'csdm/ui/maps/radar-level';
import { useTranslateEconomyType } from 'csdm/ui/match/economy/team-economy-breakdown/use-translate-economy-type';

type Props = {
  ctWindowEndSeconds: number;
  ctWindowMaxSeconds: number;
  ctWindowMinSeconds: number;
  ctWindowStartSeconds: number;
  economyType: EconomyType;
  game: Game;
  mapName: string;
  mapNames: string[];
  isGeneratingPositions: boolean;
  onCtWindowEndSecondsChange: (seconds: number) => void;
  onCtWindowStartSecondsChange: (seconds: number) => void;
  onEconomyTypeChange: (economyType: EconomyType) => void;
  onMapNameChange: (mapName: string) => void;
  onRadarLevelChange: (radarLevel: RadarLevel) => void;
  onSideChange: (side: TeamNumber) => void;
  onGeneratePositionsClick: () => void;
  radarLevel: RadarLevel;
  response: TeamTacticsResponse | undefined;
  side: TeamNumber;
};

const sideOptions: SelectOption<TeamNumber>[] = [
  {
    label: 'T',
    value: TeamNumber.T,
  },
  {
    label: 'CT',
    value: TeamNumber.CT,
  },
];

export function TeamTacticsFilters({
  ctWindowEndSeconds,
  ctWindowMaxSeconds,
  ctWindowMinSeconds,
  ctWindowStartSeconds,
  economyType,
  game,
  isGeneratingPositions,
  mapName,
  mapNames,
  onCtWindowEndSecondsChange,
  onCtWindowStartSecondsChange,
  onEconomyTypeChange,
  onMapNameChange,
  onRadarLevelChange,
  onSideChange,
  onGeneratePositionsClick,
  radarLevel,
  response,
  side,
}: Props) {
  const { translateEconomyType } = useTranslateEconomyType();
  const mapOptions = mapNames.map<SelectOption>((mapName) => {
    return {
      value: mapName,
      label: mapName,
    };
  });
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

  return (
    <HeatmapFilters>
      <div className="rounded-8 border border-gray-300 bg-gray-50 p-12">
        <p className="text-body-strong">
          <Trans>Tactics v1</Trans>
        </p>
        <p className="mt-8 text-caption text-gray-800">
          <Trans>
            CS2 tactics filters the currently loaded team matches by map, side and economy type. Position heatmaps use
            only the freeze-end window needed for tactics.
          </Trans>
        </p>
      </div>
      <div className="flex flex-col gap-y-8">
        <InputLabel>
          <Trans context="Input label">Map</Trans>
        </InputLabel>
        <Select options={mapOptions} value={mapName} onChange={onMapNameChange} />
      </div>
      <div className="flex flex-col gap-y-8">
        <InputLabel>
          <Trans context="Input label">Side</Trans>
        </InputLabel>
        <Select options={sideOptions} value={side} onChange={onSideChange} />
      </div>
      <div className="flex flex-col gap-y-8">
        <InputLabel>
          <Trans context="Input label">Economy</Trans>
        </InputLabel>
        <Select options={economyOptions} value={economyType} onChange={onEconomyTypeChange} />
      </div>
      <div className="flex items-end gap-12">
        <SecondsInput
          label={<Trans context="Input label">Window start</Trans>}
          min={ctWindowMinSeconds}
          max={ctWindowMaxSeconds}
          value={ctWindowStartSeconds}
          onChange={onCtWindowStartSecondsChange}
        />
        <SecondsInput
          label={<Trans context="Input label">Window end</Trans>}
          min={ctWindowMinSeconds}
          max={ctWindowMaxSeconds}
          value={ctWindowEndSeconds}
          onChange={onCtWindowEndSecondsChange}
        />
      </div>
      <RadarLevelSelect
        game={game}
        mapName={mapName}
        onChange={onRadarLevelChange}
        selectedRadarLevel={radarLevel}
      />
      {response !== undefined && response.skippedMatchesWithoutPositions > 0 && (
        <div className="rounded-8 border border-gray-300 bg-gray-50 p-12">
          <p className="text-caption text-gray-800">
            <Trans>
              Some matches on the current map are missing player positions required for the tactics heatmap.
            </Trans>
          </p>
          <p className="mt-8 text-caption text-gray-800">
            <Trans>
              Generate tactics positions once for the current map matches to cover pistol, eco, semi, force buy and full
              buy rounds.
            </Trans>
          </p>
          <p className="mt-8 text-caption text-gray-800">
            <Trans>
              Missing matches: {response.skippedMatchesWithoutPositions}, missing rounds: {response.skippedRoundCount}
            </Trans>
          </p>
          <div className="mt-12">
            <SpinnableButton isLoading={isGeneratingPositions} onClick={onGeneratePositionsClick}>
              <Trans>Generate tactics positions for current map matches</Trans>
            </SpinnableButton>
          </div>
        </div>
      )}
      {response && (
        <div className="rounded-8 border border-gray-300 bg-gray-50 p-12 text-caption text-gray-800">
          <p>
            <Trans>Matches in scope: {response.selectedMatchCount}</Trans>
          </p>
          <p>
            <Trans>Rounds found: {response.roundCount}</Trans>
          </p>
          <p>
            <Trans>Matches analyzed: {response.analyzedMatchCount}</Trans>
          </p>
          {response.skippedMatchesWithoutPositions > 0 && (
            <p>
              <Trans>
                Skipped matches without positions: {response.skippedMatchesWithoutPositions} ({response.skippedRoundCount}
                {' '}rounds)
              </Trans>
            </p>
          )}
        </div>
      )}
    </HeatmapFilters>
  );
}
