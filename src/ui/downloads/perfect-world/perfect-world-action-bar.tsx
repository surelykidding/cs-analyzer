import React from 'react';
import { ActionBar as CommonActionBar } from 'csdm/ui/components/action-bar';
import { Status } from 'csdm/common/types/status';
import type { SelectOption } from 'csdm/ui/components/inputs/select';
import { RefreshButton } from 'csdm/ui/components/buttons/refresh-button';
import { RevealDownloadFolderInExplorerButton } from '../reveal-download-folder-in-explorer-button';
import { Select } from 'csdm/ui/components/inputs/select';
import { DownloadDemosButton } from '../download-demos-button';
import { DownloadSource } from 'csdm/common/download/download-types';
import type { PerfectWorldDownload } from 'csdm/common/download/download-types';
import { usePerfectWorldState } from './use-perfect-world-state';
import { usePerfectWorldAccounts } from './use-perfect-world-accounts';
import { useCurrentPerfectWorldAccount } from './use-current-perfect-world-account';
import { useUpdateCurrentPerfectWorldAccount } from './use-update-current-perfect-world-account';
import { useFetchLastPerfectWorldMatches } from './use-fetch-last-perfect-world-matches';

function AccountSelect() {
  const { status } = usePerfectWorldState();
  const isDisabled = status === Status.Loading || status === Status.Idle;
  const accounts = usePerfectWorldAccounts();
  const currentAccount = useCurrentPerfectWorldAccount();
  const updateCurrentAccount = useUpdateCurrentPerfectWorldAccount();
  const options: SelectOption[] = accounts.map((account) => {
    return {
      value: account.id,
      label: account.isValid ? account.nickname : `${account.nickname} (stale)`,
    };
  });

  const onChange = async (accountId: string) => {
    await updateCurrentAccount(accountId);
  };

  if (accounts.length === 0) {
    return null;
  }

  return <Select options={options} value={currentAccount?.id} onChange={onChange} isDisabled={isDisabled} />;
}

function RefreshMatchesButton() {
  const fetchLastMatches = useFetchLastPerfectWorldMatches();
  const { status } = usePerfectWorldState();
  const isDisabled = status === Status.Loading || status === Status.Idle;

  return <RefreshButton onClick={fetchLastMatches} isDisabled={isDisabled} />;
}

function DownloadAllButton() {
  const { status, matches } = usePerfectWorldState();
  const downloads: PerfectWorldDownload[] = matches.map((match) => {
    return {
      demoUrl: match.demoUrl,
      fileName: match.id,
      game: match.game,
      match,
      matchId: match.id,
      source: DownloadSource.PerfectWorld,
    };
  });

  return <DownloadDemosButton downloads={downloads} loadingStatus={status} />;
}

export function PerfectWorldActionBar() {
  return (
    <CommonActionBar
      left={
        <>
          <RefreshMatchesButton />
          <DownloadAllButton />
          <RevealDownloadFolderInExplorerButton />
          <AccountSelect />
        </>
      }
    />
  );
}
