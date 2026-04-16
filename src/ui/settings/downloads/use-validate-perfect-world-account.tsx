import React, { useState, type ReactNode } from 'react';
import { Trans } from '@lingui/react/macro';
import { RendererClientMessageName } from 'csdm/server/renderer-client-message-name';
import { getPerfectWorldErrorMessage } from 'csdm/ui/downloads/perfect-world/get-perfect-world-error-message';
import { accountsUpdated } from 'csdm/ui/downloads/perfect-world/perfect-world-actions';
import { useWebSocketClient } from 'csdm/ui/hooks/use-web-socket-client';
import { useDispatch } from 'csdm/ui/store/use-dispatch';
import { useRefreshPerfectWorldAccounts } from 'csdm/ui/downloads/perfect-world/use-refresh-perfect-world-accounts';

export function useValidatePerfectWorldAccount() {
  const client = useWebSocketClient();
  const dispatch = useDispatch();
  const refreshAccounts = useRefreshPerfectWorldAccounts();
  const [errorMessage, setErrorMessage] = useState<ReactNode | undefined>(undefined);
  const [isBusy, setIsBusy] = useState(false);

  const validatePerfectWorldAccount = async (accountId: string) => {
    try {
      setIsBusy(true);
      setErrorMessage(undefined);
      const accounts = await client.send({
        name: RendererClientMessageName.ValidatePerfectWorldAccount,
        payload: accountId,
      });
      dispatch(accountsUpdated({ accounts }));
      setIsBusy(false);

      return true;
    } catch (error) {
      if (getPerfectWorldErrorMessage(error) !== undefined) {
        await refreshAccounts();
      }

      setErrorMessage(
        getPerfectWorldErrorMessage(error) ??
          (typeof error === 'string' ? error : <Trans>An error occurred while validating the Perfect World account.</Trans>),
      );
      setIsBusy(false);

      return false;
    }
  };

  return {
    validatePerfectWorldAccount,
    errorMessage,
    isBusy,
  };
}
