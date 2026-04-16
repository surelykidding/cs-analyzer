import React, { useState } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import type { PerfectWorldAccount } from 'csdm/common/types/perfect-world-account';
import { Button, ButtonVariant } from 'csdm/ui/components/buttons/button';
import { TextInput } from 'csdm/ui/components/inputs/text-input';
import { ErrorMessage } from 'csdm/ui/components/error-message';
import { useAddPerfectWorldAccount } from 'csdm/ui/settings/downloads/use-add-perfect-world-account';
import { useImportPerfectWorldClientAccount } from 'csdm/ui/settings/downloads/use-import-perfect-world-client-account';
import { PerfectWorldAccountInstructions } from './perfect-world-account-instructions';

type Props = {
  status?: 'missing' | 'stale';
  currentAccount?: PerfectWorldAccount;
};

export function NoPerfectWorldAccount({ status = 'missing', currentAccount }: Props) {
  const { t } = useLingui();
  const [mobilePhone, setMobilePhone] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const { addPerfectWorldAccount, errorMessage, isBusy } = useAddPerfectWorldAccount();
  const {
    importPerfectWorldClientAccount,
    errorMessage: importErrorMessage,
    isBusy: isImportBusy,
  } = useImportPerfectWorldClientAccount();

  const submit = async () => {
    await addPerfectWorldAccount(mobilePhone, securityCode);
  };

  const isDisabled = isBusy || isImportBusy || mobilePhone === '' || securityCode === '';
  const isLoading = isBusy || isImportBusy;

  return (
    <div className="mx-auto mt-48 flex w-[320px] flex-col">
      <p className="text-body-strong">
        {status === 'stale' ? (
          <Trans>
            The saved Perfect World session for {currentAccount?.nickname ?? 'this account'} has expired. Import a fresh
            client session, or sign in again with your mobile phone and SMS security code.
          </Trans>
        ) : (
          <Trans>
            Import your current Perfect World desktop client session, or enter your mobile phone number and SMS security
            code.
          </Trans>
        )}
      </p>
      {status === 'stale' && currentAccount?.lastError && (
        <div className="mt-8">
          <ErrorMessage message={currentAccount.lastError} />
        </div>
      )}
      <div className="mt-8">
        <Button
          variant={ButtonVariant.Primary}
          onClick={async () => {
            await importPerfectWorldClientAccount();
          }}
          isDisabled={isLoading}
        >
          <Trans context="Button">Import from client</Trans>
        </Button>
      </div>
      <p className="mt-8 text-caption text-gray-800">
        {status === 'stale' ? <Trans>Or refresh the saved login manually:</Trans> : <Trans>Or sign in manually:</Trans>}
      </p>
      <div className="mt-8 flex flex-col gap-y-8">
        <TextInput
          placeholder={t({ message: 'Mobile phone', context: 'Input placeholder' })}
          onChange={(event) => {
            setMobilePhone(event.target.value);
          }}
          autoFocus={true}
          value={mobilePhone}
          isDisabled={isLoading}
        />
        <TextInput
          placeholder={t({ message: 'Security code', context: 'Input placeholder' })}
          onChange={(event) => {
            setSecurityCode(event.target.value);
          }}
          value={securityCode}
          isDisabled={isLoading}
          onEnterKeyDown={submit}
        />
      </div>

      <div className="my-8">
        <Button variant={ButtonVariant.Primary} onClick={submit} isDisabled={isDisabled}>
          <Trans context="Button">Login</Trans>
        </Button>
      </div>
      {errorMessage && <ErrorMessage message={errorMessage} />}
      {importErrorMessage && <ErrorMessage message={importErrorMessage} />}

      <PerfectWorldAccountInstructions />
    </div>
  );
}
