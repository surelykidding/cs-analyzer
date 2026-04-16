import React from 'react';
import { Trans } from '@lingui/react/macro';
import {
  APP_DISPLAY_NAME,
  APP_DOCUMENTATION_URL,
  APP_RELEASES_URL,
  APP_TESTING_GUIDE_ZH_CN_URL,
} from 'csdm/common/branding';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from 'csdm/ui/dialogs/dialog';
import { useDialog } from 'csdm/ui/components/dialogs/use-dialog';
import { CloseButton } from 'csdm/ui/components/buttons/close-button';
import { ExternalLink } from 'csdm/ui/components/external-link';
import { Donate } from 'csdm/ui/components/donate';

export function ChangelogDialog() {
  const { hideDialog } = useDialog();

  return (
    <Dialog>
      <DialogHeader>
        <DialogTitle>
          <Trans>
            {APP_DISPLAY_NAME} {APP_VERSION}
          </Trans>
        </DialogTitle>
      </DialogHeader>
      <DialogContent>
        <div className="flex max-w-[700px] flex-col gap-y-16 **:select-text">
          <section className="flex flex-col gap-y-8">
            <p className="text-body-strong">
              <Trans>Windows beta release focused on tactics analysis and scouting workflows.</Trans>
            </p>
            <ul className="list-disc pl-16">
              <li>
                <Trans>Team tactics and scouting tactics remain the main focus of this release.</Trans>
              </li>
              <li>
                <Trans>Perfect World account import, validation, match scouting, and demo processing are included.</Trans>
              </li>
              <li>
                <Trans>FACEIT works out of the box with the bundled beta API key, with an optional user override.</Trans>
              </li>
              <li>
                <Trans>Beta builds use manual updates from GitHub pre-releases instead of in-app auto-update.</Trans>
              </li>
            </ul>
          </section>
          <section className="flex flex-col gap-y-8">
            <p className="text-body-strong">
              <Trans>Need setup steps or troubleshooting?</Trans>
            </p>
            <p>
              <Trans>
                Open the testing guides for detailed installation, PostgreSQL setup, FACEIT scouting, team tactics, and
                Perfect World workflows.
              </Trans>
            </p>
            <div className="flex flex-wrap gap-12">
              <ExternalLink href={APP_DOCUMENTATION_URL}>
                <Trans>Testing guide (EN)</Trans>
              </ExternalLink>
              <ExternalLink href={APP_TESTING_GUIDE_ZH_CN_URL}>
                <Trans>Testing guide (ZH-CN)</Trans>
              </ExternalLink>
              <ExternalLink href={APP_RELEASES_URL}>
                <Trans>GitHub pre-releases</Trans>
              </ExternalLink>
            </div>
          </section>
          <Donate />
        </div>
      </DialogContent>
      <DialogFooter>
        <ExternalLink href={APP_RELEASES_URL}>
          <Trans>Open release page</Trans>
        </ExternalLink>
        <CloseButton onClick={hideDialog} />
      </DialogFooter>
    </Dialog>
  );
}
