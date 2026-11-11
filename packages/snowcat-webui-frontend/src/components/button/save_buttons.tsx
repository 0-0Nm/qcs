import { Button } from '@heroui/button';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { IoMdRefresh } from 'react-icons/io';

export interface SaveButtonsProps {
  onSubmit: () => void;
  reset: () => void;
  refresh?: () => void;
  isSubmitting: boolean;
  className?: string;
}

const SaveButtons: React.FC<SaveButtonsProps> = ({
  onSubmit,
  reset,
  isSubmitting,
  refresh,
  className,
}) => (
  <div
    className={clsx(
      'w-full flex flex-col justify-center gap-3',
      className
    )}
  >
    <div className='flex items-center justify-center gap-2.5 mt-6 pt-5 border-t border-white/50 dark:border-white/[0.06]'>
      <Button
        radius='full'
        variant='flat'
        className='font-medium bg-white/60 dark:bg-white/[0.06] text-default-600 border border-white/50 dark:border-white/10 px-5'
        onPress={() => {
          reset();
          toast.success('重置成功');
        }}
      >
        取消更改
      </Button>
      <Button
        color='primary'
        radius='full'
        className='font-semibold px-7 bg-gradient-to-r from-primary-400 to-primary-600 shadow-md shadow-primary-500/30'
        isLoading={isSubmitting}
        onPress={() => onSubmit()}
      >
        保存
      </Button>
      {refresh && (
        <Button
          isIconOnly
          radius='full'
          variant='flat'
          className='text-default-500 bg-white/60 dark:bg-white/[0.06] border border-white/50 dark:border-white/10'
          onPress={() => refresh()}
        >
          <IoMdRefresh size={20} />
        </Button>
      )}
    </div>
  </div>
);

export default SaveButtons;
