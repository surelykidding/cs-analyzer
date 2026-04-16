import React, { useEffect } from 'react';
import { Trans } from '@lingui/react/macro';
import { Status } from 'csdm/common/types/status';
import { Message } from 'csdm/ui/components/message';
import { DownloadsFolderRequired } from '../downloads-folder-required';
import { useDownloadFolderPath } from '../../settings/downloads/use-download-folder-path';
import { usePerfectWorldState } from './use-perfect-world-state';
import { useFetchLastPerfectWorldMatches } from './use-fetch-last-perfect-world-matches';
import { useCurrentPerfectWorldAccount } from './use-current-perfect-world-account';
import { NoPerfectWorldAccount } from './no-perfect-world-account';
import { PerfectWorldDownloadSidebar } from './perfect-world-download-sidebar';
import { PerfectWorldCurrentMatch } from './perfect-world-current-match';

export function PerfectWorldLastMatchesLoader() {
  const fetchLastMatches = useFetchLastPerfectWorldMatches();
  const { status, matches } = usePerfectWorldState();
  const currentAccount = useCurrentPerfectWorldAccount();
  const downloadFolderPath = useDownloadFolderPath();

  useEffect(() => {
    if (status === Status.Idle && currentAccount !== undefined && currentAccount.isValid) {
      void fetchLastMatches();
    }
  }, [currentAccount, status, fetchLastMatches]);

  if (downloadFolderPath === undefined) {
    return <DownloadsFolderRequired />;
  }

  if (currentAccount === undefined) {
    return <NoPerfectWorldAccount />;
  }

  if (!currentAccount.isValid) {
    return <NoPerfectWorldAccount status="stale" currentAccount={currentAccount} />;
  }

  if (status === Status.Loading) {
    return <Message message={<Trans>Fetching last Perfect World matches...</Trans>} />;
  }

  if (status === Status.Error) {
    return <Message message={<Trans>An error occurred while fetching Perfect World matches.</Trans>} />;
  }

  if (matches.length === 0) {
    return <Message message={<Trans>No matches found for the current account.</Trans>} />;
  }

  return (
    <div className="flex overflow-hidden">
      <PerfectWorldDownloadSidebar />
      <PerfectWorldCurrentMatch />
    </div>
  );
}
