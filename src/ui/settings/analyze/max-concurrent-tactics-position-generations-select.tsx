import React from 'react';
import { Trans } from '@lingui/react/macro';
import { MAX_CONCURRENT_ANALYSES, DEFAULT_MAX_CONCURRENT_TACTICS_POSITION_GENERATIONS } from 'csdm/common/analyses';
import type { SelectOption } from 'csdm/ui/components/inputs/select';
import { Select } from 'csdm/ui/components/inputs/select';
import { SettingsEntry } from 'csdm/ui/settings/settings-entry';
import { useUpdateSettings } from '../use-update-settings';
import { useAnalyzeSettings } from './use-analyze-settings';

export function MaxConcurrentTacticsPositionGenerationsSelect() {
  const { maxConcurrentTacticsPositionGenerations } = useAnalyzeSettings();
  const updateSettings = useUpdateSettings();

  const options: SelectOption<number>[] = Array.from({ length: MAX_CONCURRENT_ANALYSES }, (_, index) => ({
    value: index + 1,
    label: index + 1,
  }));
  const value =
    maxConcurrentTacticsPositionGenerations ?? DEFAULT_MAX_CONCURRENT_TACTICS_POSITION_GENERATIONS;

  return (
    <SettingsEntry
      interactiveComponent={
        <Select
          options={options}
          value={value}
          onChange={async (maxConcurrentTacticsPositionGenerations) => {
            await updateSettings({
              analyze: {
                maxConcurrentTacticsPositionGenerations: Number(maxConcurrentTacticsPositionGenerations),
              },
            });
          }}
        />
      }
      title={<Trans context="Settings title">Maximum number of concurrent tactics position generations</Trans>}
      description={
        <Trans>Maximum number of pistol-round tactics position generations that can run at the same time.</Trans>
      }
    />
  );
}
