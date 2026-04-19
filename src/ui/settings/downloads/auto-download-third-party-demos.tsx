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
  settingsKey: Extract<keyof DownloadSettings, `download${string}AtStartup`>;
};

export function AutoDownloadThirdPartyDemos({ name, settingsKey }: Props) {
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

  const title = isChinese ? '启动时下载' : <Trans context="Settings title">Startup download</Trans>;
  const description = isChinese ? `应用启动时自动下载 ${name} demo。` : <Trans>Automatically download {name} demos at application startup.</Trans>;

  return (
    <SettingsEntry
      interactiveComponent={<Switch isChecked={download[settingsKey]} onChange={onChange} />}
      description={description}
      title={title}
    />
  );
}
