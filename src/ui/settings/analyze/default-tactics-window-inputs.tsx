import React from 'react';
import { Trans } from '@lingui/react/macro';
import {
  DEFAULT_TACTICS_WINDOW_END_SECONDS,
  DEFAULT_TACTICS_WINDOW_START_SECONDS,
  TACTICS_POSITIONS_WINDOW_MAX_SECONDS,
  TACTICS_POSITIONS_WINDOW_MIN_SECONDS,
} from 'csdm/common/types/team-tactics';
import { SecondsInput } from 'csdm/ui/components/inputs/seconds-input';
import { SettingsEntry } from 'csdm/ui/settings/settings-entry';
import { useUpdateSettings } from '../use-update-settings';
import { useAnalyzeSettings } from './use-analyze-settings';

export function DefaultTacticsWindowInputs() {
  const { defaultTacticsWindowStartSeconds, defaultTacticsWindowEndSeconds } = useAnalyzeSettings();
  const updateSettings = useUpdateSettings();
  const windowStartSeconds = defaultTacticsWindowStartSeconds ?? DEFAULT_TACTICS_WINDOW_START_SECONDS;
  const windowEndSeconds = defaultTacticsWindowEndSeconds ?? DEFAULT_TACTICS_WINDOW_END_SECONDS;

  return (
    <SettingsEntry
      interactiveComponent={
        <div className="flex items-end gap-12">
          <SecondsInput
            label={<Trans context="Input label">Start</Trans>}
            min={TACTICS_POSITIONS_WINDOW_MIN_SECONDS}
            max={TACTICS_POSITIONS_WINDOW_MAX_SECONDS}
            value={windowStartSeconds}
            onChange={async (seconds) => {
              await updateSettings({
                analyze: {
                  defaultTacticsWindowStartSeconds: Math.max(
                    TACTICS_POSITIONS_WINDOW_MIN_SECONDS,
                    Math.min(seconds, windowEndSeconds - 1),
                  ),
                },
              });
            }}
          />
          <SecondsInput
            label={<Trans context="Input label">End</Trans>}
            min={TACTICS_POSITIONS_WINDOW_MIN_SECONDS}
            max={TACTICS_POSITIONS_WINDOW_MAX_SECONDS}
            value={windowEndSeconds}
            onChange={async (seconds) => {
              await updateSettings({
                analyze: {
                  defaultTacticsWindowEndSeconds: Math.min(
                    TACTICS_POSITIONS_WINDOW_MAX_SECONDS,
                    Math.max(seconds, windowStartSeconds + 1),
                  ),
                },
              });
            }}
          />
        </div>
      }
      title={<Trans context="Settings title">Default tactics window</Trans>}
      description={<Trans>Default freeze-end time window used when opening tactics and scouting pages.</Trans>}
    />
  );
}
