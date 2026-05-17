import React, { useEffect, useState } from 'react';
import { Trans } from '@lingui/react/macro';
import { isPrereleaseVersion } from 'csdm/common/branding';
import { UpdateIcon } from 'csdm/ui/icons/update-icon';
import { Tooltip } from 'csdm/ui/components/tooltip';

export function UpdateAvailableButton() {
  const isPrerelease = isPrereleaseVersion(APP_VERSION);

  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (isPrerelease) {
      return;
    }

    void window.csdm.hasUpdateReadyToInstall().then(setUpdateAvailable);
  }, [isPrerelease]);

  const onClick = () => {
    window.csdm.installUpdate();
  };

  useEffect(() => {
    if (isPrerelease) {
      return;
    }

    const onUpdateDownloaded = () => {
      setUpdateAvailable(true);
    };

    const unListen = window.csdm.onUpdateDownloaded(onUpdateDownloaded);

    return () => {
      unListen();
    };
  }, [isPrerelease]);

  if (isPrerelease || !updateAvailable) {
    return null;
  }

  return (
    <div className="no-drag">
      <Tooltip content={<Trans>Update ready!</Trans>} placement="bottom" delay={0}>
        <button
          className="flex border border-transparent text-green-400 no-underline outline-hidden transition-all duration-85 hover:text-green-700"
          onClick={onClick}
        >
          <UpdateIcon className="w-20" />
        </button>
      </Tooltip>
    </div>
  );
}
