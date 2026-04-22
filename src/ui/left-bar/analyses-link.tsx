import React from 'react';
import { Trans } from '@lingui/react/macro';
import { RoutePath } from 'csdm/ui/routes-paths';
import { PendingIcon } from 'csdm/ui/icons/pending-icon';
import { LeftBarLink } from './left-bar-link';

export function AnalysesLink() {
  return (
    <LeftBarLink icon={<PendingIcon />} tooltip={<Trans context="Tooltip">Analyses</Trans>} url={RoutePath.Analyses} />
  );
}
