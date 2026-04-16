import React, { useState, type ReactNode } from 'react';
import { Trans } from '@lingui/react/macro';
import { useWebSocketClient } from 'csdm/ui/hooks/use-web-socket-client';
import { RendererClientMessageName } from 'csdm/server/renderer-client-message-name';
import { useDispatch } from 'csdm/ui/store/use-dispatch';
import { accountAdded } from 'csdm/ui/downloads/perfect-world/perfect-world-actions';

export function useAddPerfectWorldAccount() {
  const client = useWebSocketClient();
  const dispatch = useDispatch();
  const [errorMessage, setErrorMessage] = useState<ReactNode | undefined>(undefined);
  const [isBusy, setIsBusy] = useState(false);

  const addPerfectWorldAccount = async (mobilePhone: string, securityCode: string) => {
    try {
      if (mobilePhone === '' || securityCode === '') {
        return false;
      }

      setIsBusy(true);
      setErrorMessage(undefined);
      const account = await client.send({
        name: RendererClientMessageName.AddPerfectWorldAccount,
        payload: {
          mobilePhone,
          securityCode,
        },
      });
      dispatch(accountAdded({ account }));
      setIsBusy(false);

      return true;
    } catch (error) {
      setErrorMessage(typeof error === 'string' ? error : <Trans>An error occurred while logging into Perfect World.</Trans>);
      setIsBusy(false);

      return false;
    }
  };

  return { addPerfectWorldAccount, isBusy, errorMessage };
}
