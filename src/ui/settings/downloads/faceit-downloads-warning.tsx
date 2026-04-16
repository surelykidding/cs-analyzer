import React from 'react';
import { Trans } from '@lingui/react/macro';
import { ExclamationTriangleIcon } from 'csdm/ui/icons/exclamation-triangle-icon';
import { ExternalLink } from 'csdm/ui/components/external-link';

export function FaceitDownloadsWarning() {
  return (
    <div className="flex items-center gap-x-8">
      <ExclamationTriangleIcon className="size-32 text-red-700" />
      <div>
        <p className="selectable">
          <Trans>
            This beta already includes a built-in FACEIT API key, so testers do not need to request or paste one
            before using scouting, tactics, or account import flows.
          </Trans>
        </p>
        <p className="selectable">
          <Trans>
            If you want to use your own FACEIT quota, you can still add an optional override in Settings {'>'}{' '}
            Integrations.
          </Trans>
        </p>
        <p className="selectable">
          <Trans>
            FACEIT still controls access to some download endpoints through a{' '}
            <ExternalLink href="https://docs.faceit.com/getting-started/Guides/download-api">private API</ExternalLink>
            , so availability may depend on the current server-side allowance.
          </Trans>
        </p>
      </div>
    </div>
  );
}
