import React from 'react';
import { ExclamationTriangleIcon } from 'csdm/ui/icons/exclamation-triangle-icon';
import { useLocale } from 'csdm/ui/settings/ui/use-locale';

export function FaceitDownloadsWarning() {
  const locale = useLocale();
  const isSimplifiedChinese = locale === 'zh-CN';
  const isTraditionalChinese = locale === 'zh-TW';

  const paragraphs = isSimplifiedChinese
    ? [
        '这个 beta 版本已经内置了 FACEIT API key，测试者不需要再单独申请或粘贴 key 就能使用账号导入、scouting 和 tactics。',
        '如果你想使用自己的 FACEIT 配额，仍然可以在 Settings > Integrations > FACEIT API key override 里填写可选覆盖值。',
        'FACEIT 仍然会在服务端限制部分下载接口，所以某些 demo 下载能力可能会随平台策略变化。',
      ]
    : isTraditionalChinese
      ? [
          '這個 beta 版本已經內建了 FACEIT API key，測試者不需要再另外申請或貼上 key，就能使用帳號匯入、scouting 與 tactics。',
          '如果你想使用自己的 FACEIT 配額，仍然可以在 Settings > Integrations > FACEIT API key override 中填寫可選覆蓋值。',
          'FACEIT 仍然會在伺服器端限制部分下載介面，因此某些 demo 下載能力可能會隨平台策略變動。',
        ]
      : [
          'This beta already includes a built-in FACEIT API key, so testers can use account import, scouting, and tactics without requesting or pasting one.',
          'If you want to use your own FACEIT quota, you can still add an optional override in Settings > Integrations > FACEIT API key override.',
          'FACEIT still restricts some download endpoints on the server side, so demo availability may change over time.',
        ];

  return (
    <div className="flex items-start gap-x-8">
      <ExclamationTriangleIcon className="size-32 text-red-700" />
      <div>
        {paragraphs.map((paragraph, index) => {
          return (
            <p key={index} className="selectable">
              {paragraph}
            </p>
          );
        })}
      </div>
    </div>
  );
}
