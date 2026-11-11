import { Spinner } from '@heroui/spinner';
import clsx from 'clsx';

export interface PageLoadingProps {
  loading?: boolean;
}
const PageLoading: React.FC<PageLoadingProps> = ({ loading }) => {
  return (
    <div
      className={clsx(
        'absolute inset-0 z-30 flex justify-center items-center rounded-2xl',
        'bg-white/40 dark:bg-black/30 backdrop-blur-md',
        {
          hidden: !loading,
        }
      )}
    >
      <div className='px-6 py-5 rounded-2xl bg-white/80 dark:bg-white/[0.06] border border-white/70 dark:border-white/10 shadow-lg flex flex-col items-center gap-3'>
        <Spinner size='lg' color='primary' />
        <span className='text-[10px] text-default-500 tracking-[0.25em] uppercase'>Loading</span>
      </div>
    </div>
  );
};

export default PageLoading;
