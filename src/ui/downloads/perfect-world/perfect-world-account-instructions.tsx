import React from 'react';
import { Trans } from '@lingui/react/macro';

export function PerfectWorldAccountInstructions() {
  return (
    <div className="text-caption text-gray-800">
      <p>
        <Trans>Perfect World scouting requires a logged-in platform account stored in the app.</Trans>
      </p>
      <p className="mt-4">
        <Trans>If the Perfect World desktop client is already logged in, you can import that session directly.</Trans>
      </p>
      <p className="mt-4">
        <Trans>
          After importing, the desktop client does not need to keep running. You only need to refresh the saved session
          if the token expires.
        </Trans>
      </p>
      <p className="mt-4">
        <Trans>
          Otherwise, enter the mobile phone number linked to your account and an SMS code received from the Perfect World
          client or website.
        </Trans>
      </p>
    </div>
  );
}
