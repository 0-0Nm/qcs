import { Button } from '@heroui/button';
import { Image } from '@heroui/image';
import { Input } from '@heroui/input';
import { useRef } from 'react';

export interface ImageInputProps {
  onChange: (base64: string) => void;
  value: string;
  label?: string;
}

const ImageInput: React.FC<ImageInputProps> = ({ onChange, value, label }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className='flex items-center gap-2.5'>
      <div className='w-9 h-9 flex-shrink-0 rounded-xl overflow-hidden bg-white/60 dark:bg-white/[0.06] border border-black/[0.07] dark:border-white/10 flex items-center justify-center'>
        {value
          ? <Image src={value} alt={label} className='w-full h-full object-cover rounded-none' />
          : <span className='text-[10px] text-default-300'>无图</span>}
      </div>
      <Input
        ref={inputRef}
        label={label}
        type='file'
        placeholder='选择图片'
        accept='image/*'
        size='sm'
        classNames={{
          inputWrapper:
            'bg-white/80 dark:bg-white/[0.06] backdrop-blur-md border border-black/[0.08] dark:border-white/12 hover:bg-white/95 dark:hover:bg-white/[0.09] transition-all shadow-sm data-[hover=true]:border-primary/35',
          input: 'bg-transparent text-default-700 dark:text-default-200 placeholder:text-default-400',
        }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = async () => {
              const base64 = reader.result as string;
              onChange(base64);
            };
            reader.readAsDataURL(file);
          }
        }}
      />
      <Button
        onPress={() => {
          onChange('');
          if (inputRef.current) inputRef.current.value = '';
        }}
        color='danger'
        variant='flat'
        size='sm'
        radius='full'
        isDisabled={!value}
        className='flex-shrink-0 text-xs px-3'
      >
        清除
      </Button>
    </div>
  );
};

export default ImageInput;
