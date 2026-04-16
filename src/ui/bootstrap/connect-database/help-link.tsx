import React from 'react';
import { Trans } from '@lingui/react/macro';
import { APP_DOCUMENTATION_URL } from 'csdm/common/branding';
import { ExternalLink } from 'csdm/ui/components/external-link';

function getDocumentationLink() {
  return APP_DOCUMENTATION_URL;
}

export function HelpLink() {
  const docLink = getDocumentationLink();

  return (
    <p>
      <Trans>Please read the {<ExternalLink href={docLink}>documentation</ExternalLink>} for help.</Trans>
    </p>
  );
}
