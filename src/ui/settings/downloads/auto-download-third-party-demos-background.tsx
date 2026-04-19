import React from 'react';
import { Trans } from '@lingui/react/macro';
import { Switch } from 'csdm/ui/components/inputs/switch';
import { SettingsEntry } from 'csdm/ui/settings/settings-entry';
import { useSettings } from '../use-settings';
import { useUpdateSettings } from '../use-update-settings';
import type { DownloadSettings } from 'csdm/node/settings/settings';
import { isChineseLocale } from 'csdm/common/locale';
import { useLocale } from 'csdm/ui/settings/ui/use-locale';

type Props = {
  name: string;
  settingsKey: Extract<keyof DownloadSettings, `download${string}InBackground`>;
};

export function AutoDownloadThirdPartyDemosBackground({ name, settingsKey }: Props) {
  const { download } = useSettings();
  const updateSettings = useUpdateSettings();
  const locale = useLocale();
  const isChinese = isChineseLocale(locale);

  const onChange = async (isChecked: boolean) => {
    await updateSettings({
      download: {
        [settingsKey]: isChecked,
      },
    });
  };

  const title = isChinese ? '后台下载' : <Trans context="Settings title">Background download</Trans>;
  const description = isChinese ? `在后台自动下载 ${name} demo。` : <Trans>Automatically download {name} demos in the background.</Trans>;

  return (
    <SettingsEntry
      interactiveComponent={<Switch isChecked={download[settingsKey]} onChange={onChange} />}
      description={description}
      title={title}
    />
  );
}
