import React from 'react';
import { SettingsView } from 'csdm/ui/settings/settings-view';
import { DefaultTacticsWindowInputs } from './default-tactics-window-inputs';
import { MaxConcurrentAnalysesSelect } from './max-concurrent-analyses-select';
import { MaxConcurrentTacticsPositionGenerationsSelect } from './max-concurrent-tactics-position-generations-select';

export function AnalyzeSettings() {
  return (
    <SettingsView>
      <MaxConcurrentAnalysesSelect />
      <MaxConcurrentTacticsPositionGenerationsSelect />
      <DefaultTacticsWindowInputs />
    </SettingsView>
  );
}
