import React from 'react';
import { Trans } from '@lingui/react/macro';
import { APP_RELEASES_URL } from 'csdm/common/branding';
import { ExternalLink } from './external-link';

export function Donate() {
  return (
    <div className="flex flex-col">
      <h3 className="text-subtitle">
        <Trans>Donate</Trans>
      </h3>
      <p>
        <Trans>
          CS Analyzer is a community Counter-Strike analysis tool focused on tactics review, demo scouting, and match
          study.
        </Trans>
      </p>
      <p>
        <Trans>
          It is not backed by a corporate entity and remains a free, open-source project maintained with community
          feedback.
        </Trans>
      </p>
      <p>
        <Trans>
          Your <ExternalLink href={APP_RELEASES_URL}>support</ExternalLink> is greatly appreciated and helps keep this
          release line moving forward. Thank you!
        </Trans>
      </p>
    </div>
  );
}
