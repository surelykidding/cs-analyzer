import React from 'react';
import { Trans } from '@lingui/react/macro';
import { ActionBar as CommonActionBar } from 'csdm/ui/components/action-bar';
import { WatchDemoButton } from 'csdm/ui/downloads/watch-demo-button';
import type { PerfectWorldDownload } from 'csdm/common/download/download-types';
import { DownloadSource } from 'csdm/common/download/download-types';
import { DownloadDemoButton } from '../download-demo-button';
import { RevealDemoInExplorerButton } from '../reveal-demo-in-explorer-button';
import { SeeDemoButton } from 'csdm/ui/downloads/see-demo-button';
import { CopyDemoLinkButton } from 'csdm/ui/components/buttons/copy-demo-link-button';
import { useCurrentPerfectWorldMatch } from './use-current-perfect-world-match';
import { PerfectWorldMatch } from './perfect-world-match';
import { OpenLinkButton } from 'csdm/ui/components/buttons/open-link-button';

function DownloadButton() {
  const match = useCurrentPerfectWorldMatch();
  const download: PerfectWorldDownload = {
    game: match.game,
    demoUrl: match.demoUrl,
    fileName: match.id,
    matchId: match.id,
    source: DownloadSource.PerfectWorld,
    match,
  };

  return <DownloadDemoButton status={match.downloadStatus} download={download} />;
}

function ActionBar() {
  const match = useCurrentPerfectWorldMatch();

  return (
    <CommonActionBar
      left={
        <>
          <DownloadButton />
          <RevealDemoInExplorerButton demoFileName={match.id} downloadStatus={match.downloadStatus} />
          <SeeDemoButton demoFileName={match.id} downloadStatus={match.downloadStatus} />
          <WatchDemoButton demoFileName={match.id} game={match.game} downloadStatus={match.downloadStatus} />
          {match.demoUrl && <CopyDemoLinkButton link={match.demoUrl} />}
          {match.url && (
            <OpenLinkButton url={match.url}>
              <Trans context="Button">See source match</Trans>
            </OpenLinkButton>
          )}
        </>
      }
    />
  );
}

export function PerfectWorldCurrentMatch() {
  const match = useCurrentPerfectWorldMatch();

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <ActionBar />
      <PerfectWorldMatch match={match} />
    </div>
  );
}
