import React, { useId, type ReactNode } from 'react';
import { InputLabel } from './input-label';
import { InputNumber } from './number-input';

type Props = {
  label: ReactNode;
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
};

export function SecondsInput({ label, value, defaultValue, min = 0, max = 30, onChange }: Props) {
  const id = useId();

  return (
    <div className="flex flex-col gap-y-8">
      <InputLabel htmlFor={id}>{label}</InputLabel>
      <div className="w-[5rem]">
        <InputNumber
          id={id}
          min={min}
          max={max}
          placeholder={String(2)}
          value={value}
          defaultValue={defaultValue}
          onChange={(event) => {
            if (!(event.target instanceof HTMLInputElement)) {
              return;
            }

            const value = Number(event.target.value);
            if (value >= min && value <= max) {
              onChange(value);
            }
          }}
        />
      </div>
    </div>
  );
}
