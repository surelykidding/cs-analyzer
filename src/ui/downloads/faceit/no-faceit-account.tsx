import React, { useState } from 'react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Button, ButtonVariant } from 'csdm/ui/components/buttons/button';
import { TextInput } from 'csdm/ui/components/inputs/text-input';
import { useAddFaceitAccount } from '../../settings/downloads/use-add-faceit-account';
import { ErrorMessage } from 'csdm/ui/components/error-message';
import { ExclamationTriangleIcon } from 'csdm/ui/icons/exclamation-triangle-icon';
import { useLocale } from 'csdm/ui/settings/ui/use-locale';

export function NoFaceitAccount() {
  const { t } = useLingui();
  const locale = useLocale();
  const [nickname, setNickname] = useState('');
  const { addFaceitAccount, errorMessage, isBusy } = useAddFaceitAccount();
  const isSimplifiedChinese = locale === 'zh-CN';
  const isTraditionalChinese = locale === 'zh-TW';

  const title = isSimplifiedChinese
    ? '若要添加 FACEIT 账号，请输入你的 FACEIT 昵称。'
    : isTraditionalChinese
      ? '若要新增 FACEIT 帳號，請輸入你的 FACEIT 暱稱。'
      : 'To add a FACEIT account, enter your FACEIT nickname.';
  const placeholder = isSimplifiedChinese ? 'FACEIT 昵称' : isTraditionalChinese ? 'FACEIT 暱稱' : t({
    message: 'FACEIT nickname',
    context: 'Input placeholder',
  });
  const caseSensitiveMessage = isSimplifiedChinese
    ? '昵称区分大小写！'
    : isTraditionalChinese
      ? '暱稱區分大小寫！'
      : 'The nickname is case sensitive!';

  const submit = async () => {
    await addFaceitAccount(nickname);
  };

  const isDisabled = isBusy || nickname === '';

  return (
    <div className="mx-auto mt-48 flex max-w-[600px] flex-col">
      <p className="text-body-strong">{title}</p>
      <div className="mt-8 w-[228px]">
        <TextInput
          placeholder={placeholder}
          onChange={(event) => {
            setNickname(event.target.value);
          }}
          autoFocus={true}
          value={nickname}
          isDisabled={isBusy}
          onEnterKeyDown={submit}
        />
      </div>
      <div className="mt-4 flex items-center gap-x-8">
        <ExclamationTriangleIcon className="size-12 text-orange-700" />
        <p className="text-caption">{caseSensitiveMessage}</p>
      </div>
      <div className="my-8">
        <Button variant={ButtonVariant.Primary} onClick={submit} isDisabled={isDisabled}>
          <Trans context="Button">Add</Trans>
        </Button>
      </div>
      {errorMessage && <ErrorMessage message={errorMessage} />}
    </div>
  );
}
