import React, { useState } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Button } from 'csdm/ui/components/buttons/button';
import { TextInput } from 'csdm/ui/components/inputs/text-input';
import { ConfirmDialog } from 'csdm/ui/dialogs/confirm-dialog';
import { useDispatch } from 'csdm/ui/store/use-dispatch';
import { useDialog } from 'csdm/ui/components/dialogs/use-dialog';
import { useShowToast } from 'csdm/ui/components/toasts/use-show-toast';
import { ErrorMessage } from 'csdm/ui/components/error-message';
import { usePerfectWorldAccounts } from 'csdm/ui/downloads/perfect-world/use-perfect-world-accounts';
import { useUpdateCurrentPerfectWorldAccount } from 'csdm/ui/downloads/perfect-world/use-update-current-perfect-world-account';
import { PerfectWorldAccountInstructions } from 'csdm/ui/downloads/perfect-world/perfect-world-account-instructions';
import { accountsUpdated } from 'csdm/ui/downloads/perfect-world/perfect-world-actions';
import { ThirdPartySettings } from './third-party-settings';
import { ThirdPartyAccounts } from './third-party-accounts';
import { useAddPerfectWorldAccount } from './use-add-perfect-world-account';
import { useImportPerfectWorldClientAccount } from './use-import-perfect-world-client-account';
import { useValidatePerfectWorldAccount } from './use-validate-perfect-world-account';
import { useWebSocketClient } from 'csdm/ui/hooks/use-web-socket-client';
import { RendererClientMessageName } from 'csdm/server/renderer-client-message-name';
import type { PerfectWorldAccount } from 'csdm/common/types/perfect-world-account';

function AccountStateBadge({ account }: { account: PerfectWorldAccount }) {
  const className = account.isValid ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900';
  const label = account.isValid ? <Trans>Active</Trans> : <Trans>Stale</Trans>;

  return <span className={`rounded-999 px-8 py-4 text-caption ${className}`}>{label}</span>;
}

function AddAccountDialog() {
  const [mobilePhone, setMobilePhone] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const { addPerfectWorldAccount, errorMessage, isBusy } = useAddPerfectWorldAccount();
  const { hideDialog } = useDialog();
  const { t } = useLingui();

  const onConfirm = async () => {
    const accountAdded = await addPerfectWorldAccount(mobilePhone, securityCode);
    if (accountAdded) {
      hideDialog();
    }
  };

  return (
    <ConfirmDialog
      title={<Trans>Login to Perfect World</Trans>}
      onConfirm={onConfirm}
      closeOnConfirm={false}
      isBusy={isBusy}
    >
      <div className="flex flex-col gap-y-8">
        <TextInput
          label={t({
            context: 'Input label',
            message: 'Mobile phone',
          })}
          placeholder={t({
            context: 'Input placeholder',
            message: 'Phone number',
          })}
          value={mobilePhone}
          onChange={(event) => {
            setMobilePhone(event.target.value);
          }}
          isDisabled={isBusy}
          autoFocus={true}
        />
        <TextInput
          label={t({
            context: 'Input label',
            message: 'Security code',
          })}
          placeholder={t({
            context: 'Input placeholder',
            message: 'SMS code',
          })}
          value={securityCode}
          onChange={(event) => {
            setSecurityCode(event.target.value);
          }}
          isDisabled={isBusy}
          onEnterKeyDown={onConfirm}
        />
      </div>
      <div className="mt-8">
        <PerfectWorldAccountInstructions />
      </div>

      {errorMessage && (
        <div className="mt-8">
          <ErrorMessage message={errorMessage} />
        </div>
      )}
    </ConfirmDialog>
  );
}

export function PerfectWorldSettings() {
  const { t } = useLingui();
  const showToast = useShowToast();
  const accounts = usePerfectWorldAccounts();
  const client = useWebSocketClient();
  const dispatch = useDispatch();
  const updateCurrentAccount = useUpdateCurrentPerfectWorldAccount();
  const {
    importPerfectWorldClientAccount,
    errorMessage: importErrorMessage,
    isBusy: isImportBusy,
  } = useImportPerfectWorldClientAccount();
  const {
    validatePerfectWorldAccount,
    errorMessage: validateErrorMessage,
    isBusy: isValidateBusy,
  } = useValidatePerfectWorldAccount();
  const { showDialog } = useDialog();
  const currentAccount = accounts.find((account) => account.isCurrent);

  const deleteAccount = async (accountId: string) => {
    try {
      const accounts = await client.send({
        name: RendererClientMessageName.DeletePerfectWorldAccount,
        payload: accountId,
      });
      dispatch(accountsUpdated({ accounts }));
    } catch (error) {
      showToast({
        content: <Trans>An error occurred</Trans>,
        id: 'delete-perfect-world-account-error',
        type: 'error',
      });
    }
  };

  return (
    <ThirdPartySettings
      name={t`Perfect World`}
      logo={<span className="rounded-4 bg-gray-200 px-6 py-2 text-caption">PW</span>}
      autoDownloadAtStartupSettingsKey="downloadPerfectWorldDemosAtStartup"
      autoDownloadInBackgroundSettingsKey="downloadPerfectWorldDemosInBackground"
      warning={
        <p className="text-caption text-gray-800">
          <Trans>
            This stores your Perfect World token locally so the app can fetch match history and scouting demos without
            keeping the desktop client open.
          </Trans>
        </p>
      }
    >
      <ThirdPartyAccounts
        accounts={accounts}
        getAccountUrl={() => {
          return 'https://www.pwesports.cn/';
        }}
        onSetAsCurrentClick={updateCurrentAccount}
        onDeleteClick={deleteAccount}
        onAddClick={() => {
          showDialog(<AddAccountDialog />);
        }}
        renderAccountInfo={(account) => {
          return (
            <div className="flex flex-wrap items-center gap-8 text-caption text-gray-800">
              <AccountStateBadge account={account} />
              {account.maskedPhoneNumber && <span>{account.maskedPhoneNumber}</span>}
              {account.lastValidatedAt && <span>{new Date(account.lastValidatedAt).toLocaleString()}</span>}
              {account.isCurrent && <span><Trans>Current account</Trans></span>}
              {!account.isValid && account.lastError && (
                <span className="text-red-900" title={account.lastError}>
                  {account.lastError}
                </span>
              )}
            </div>
          );
        }}
      />
      <div className="mt-8 flex flex-col items-start gap-y-8">
        <Button
          onClick={async () => {
            await importPerfectWorldClientAccount();
          }}
          isDisabled={isImportBusy || isValidateBusy}
        >
          <Trans context="Button">Import current client session</Trans>
        </Button>
        <Button
          onClick={async () => {
            if (currentAccount !== undefined) {
              await validatePerfectWorldAccount(currentAccount.id);
            }
          }}
          isDisabled={currentAccount === undefined || isImportBusy || isValidateBusy}
        >
          <Trans context="Button">Validate current account</Trans>
        </Button>
        {importErrorMessage && <ErrorMessage message={importErrorMessage} />}
        {validateErrorMessage && <ErrorMessage message={validateErrorMessage} />}
      </div>
    </ThirdPartySettings>
  );
}
