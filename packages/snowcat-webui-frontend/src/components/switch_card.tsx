import { Switch } from '@heroui/switch';
import clsx from 'clsx';
import React, { forwardRef } from 'react';

export interface SwitchCardProps {
  label?: string;
  description?: string;
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  name?: string;
  onBlur?: React.FocusEventHandler;
  disabled?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
}

const SwitchCard = forwardRef<HTMLInputElement, SwitchCardProps>(
  (props, ref) => {
    const { label, description, value, onValueChange, disabled } = props;
    const selectString = value ? 'true' : 'false';

    return (
      <Switch
        classNames={{
          base: clsx(
            'inline-flex flex-row-reverse w-full max-w-full bg-white/60 dark:bg-white/[0.04] hover:bg-white/80 dark:hover:bg-white/[0.07] items-center',
            'justify-between cursor-pointer rounded-2xl gap-2 p-3.5 border border-black/[0.08] dark:border-white/10 transition-all duration-200',
            'data-[selected=true]:border-primary/25 data-[selected=true]:bg-primary/[0.045] data-[selected=true]:shadow-none backdrop-blur-xl'
          ),
        }}
        {...props}
        ref={ref}
        isDisabled={disabled}
        isSelected={value}
        value={selectString}
        onValueChange={onValueChange}
      >
        <div className='flex flex-col gap-1'>
          <p className='text-medium'>{label}</p>
          <p className='text-tiny text-default-400'>{description}</p>
        </div>
      </Switch>
    );
  }
);

SwitchCard.displayName = 'SwitchCard';

export default SwitchCard;
