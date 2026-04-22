import React from 'react';
import { Trans } from '@lingui/react/macro';
import { Outlet } from 'react-router';
import { TabLink } from 'csdm/ui/components/tabs/tab-link';
import { TabLinks } from 'csdm/ui/components/tabs/tab-links';
import { RoutePath } from 'csdm/ui/routes-paths';

export function Analyses() {
  return (
    <>
      <TabLinks>
        <TabLink url={RoutePath.AnalysesFaceitScouting}>
          <Trans>FACEIT Scouting</Trans>
        </TabLink>
        <TabLink url={RoutePath.Analyses5EPlayScouting}>
          <Trans>5EPlay Scouting</Trans>
        </TabLink>
        <TabLink url={RoutePath.AnalysesPerfectWorldScouting}>
          <Trans>Perfect World Scouting</Trans>
        </TabLink>
      </TabLinks>
      <Outlet />
    </>
  );
}
