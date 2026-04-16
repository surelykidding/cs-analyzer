import React, { useState, type ReactNode } from 'react';
import { Trans } from '@lingui/react/macro';
import { RendererClientMessageName } from 'csdm/server/renderer-client-message-name';
import { accountAdded } from 'csdm/ui/downloads/perfect-world/perfect-world-actions';
import { useWebSocketClient } from 'csdm/ui/hooks/use-web-socket-client';
import { useDispatch } from 'csdm/ui/store/use-dispatch';

export function useImportPerfectWorldClientAccount() {
  const client = useWebSocketClient();
  const dispatch = useDispatch();
  const [errorMessage, setErrorMessage] = useState<ReactNode | undefined>(undefined);
  const [isBusy, setIsBusy] = useState(false);

  const importPerfectWorldClientAccount = async () => {
    try {
      setIsBusy(true);
      setErrorMessage(undefined);
      const account = await client.send({
        name: RendererClientMessageName.ImportPerfectWorldClientAccount,
      });
      dispatch(accountAdded({ account }));
      setIsBusy(false);

      return true;
    } catch (error) {
      setErrorMessage(
        typeof error === 'string' ? error : <Trans>Could not import the current Perfect World desktop client session.</Trans>,
      );
      setIsBusy(false);

      return false;
    }
  };

  return {
    importPerfectWorldClientAccount,
    isBusy,
    errorMessage,
  };
}
