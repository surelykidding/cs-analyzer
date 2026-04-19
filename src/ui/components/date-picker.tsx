import React, { type ReactNode } from 'react';
import { enUS, zhCN } from 'react-day-picker/locale';
import { DayPicker } from 'react-day-picker';
import type { DateRange } from 'react-day-picker';
import { useReducedMotion } from 'motion/react';
import type { SupportedLocale } from 'csdm/common/locale';
import { useLocale } from 'csdm/ui/settings/ui/use-locale';

function getLocaleObject(locale: SupportedLocale) {
  return locale === 'zh-CN' ? zhCN : enUS;
}

type Props = {
  startDate: string | undefined;
  endDate: string | undefined;
  onRangeChange: (range: DateRange | undefined) => void;
  isDisabled?: boolean;
  footer?: ReactNode;
};

export function DatePicker({ isDisabled, startDate, endDate, onRangeChange, footer }: Props) {
  const locale = useLocale();
  const shouldReduceMotion = useReducedMotion();
  const range: DateRange | undefined = {
    from: startDate ? new Date(startDate) : undefined,
    to: endDate ? new Date(endDate) : undefined,
  };
  const csgoReleaseDate = new Date(2011, 10, 30); // Wednesday 30 November 2011, CSGO private beta release date

  return (
    <DayPicker
      disabled={isDisabled}
      mode="range"
      footer={footer}
      showOutsideDays={true}
      animate={!shouldReduceMotion}
      captionLayout="dropdown"
      selected={range}
      onSelect={onRangeChange}
      startMonth={new Date(csgoReleaseDate.getFullYear(), 0)}
      endMonth={new Date(new Date().getFullYear(), 11)}
      hidden={{
        before: csgoReleaseDate,
      }}
      locale={getLocaleObject(locale)}
    />
  );
}
