import React from 'react';
import { Trans } from '@lingui/react/macro';
import { ExclamationTriangleIcon } from 'csdm/ui/icons/exclamation-triangle-icon';

export function FaceitDownloadsWarning() {
  return (
    <div className="flex items-start gap-x-8">
      <ExclamationTriangleIcon className="size-32 text-red-700" />
      <div>
        <p className="selectable">
          <Trans>
            This beta already includes a built-in FACEIT API key, so testers can use account import, scouting, and
            tactics without requesting or pasting one.
          </Trans>
        </p>
        <p className="selectable">
          <Trans>
            If you want to use your own FACEIT quota, you can still add an optional override in Settings &gt;
            Integrations &gt; FACEIT API key override.
          </Trans>
        </p>
        <p className="selectable">
          <Trans>
            FACEIT still restricts some download endpoints on the server side, so demo availability may change over
            time.
          </Trans>
        </p>
      </div>
    </div>
  );
}
