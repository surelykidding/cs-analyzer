import React from 'react';
import { Trans } from '@lingui/react/macro';
import { Outlet } from 'react-router';
import { RoutePath } from 'csdm/ui/routes-paths';
import { TabLink } from 'csdm/ui/components/tabs/tab-link';
import { TabLinks } from 'csdm/ui/components/tabs/tab-links';
import { PendingDownloadsLink } from './pending-downloads-link';

export function Downloads() {
  return (
    <>
      <TabLinks>
        <TabLink url="">
          <Trans>Valve</Trans>
        </TabLink>
        <TabLink url={RoutePath.DownloadsFaceit}>
          <Trans>FACEIT</Trans>
        </TabLink>
        <TabLink url={RoutePath.DownloadsRenown}>
          <Trans>Renown</Trans>
        </TabLink>
        <TabLink url={RoutePath.Downloads5EPlay}>
          <Trans>5EPlay</Trans>
        </TabLink>
        <TabLink url={RoutePath.DownloadsPerfectWorld}>
          <Trans>Perfect World</Trans>
        </TabLink>
        <PendingDownloadsLink />
      </TabLinks>
      <Outlet />
    </>
  );
}
