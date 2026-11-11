import { Card, CardBody } from '@heroui/card';
import { useLocalStorage } from '@uidotdev/usehooks';
import clsx from 'clsx';
import key from '@/const/key';

export interface NetworkItemDisplayProps {
  count: number;
  label: string;
  size?: 'sm' | 'md';
  /** 强调卡：用于总数统计 */
  accent?: boolean;
}

const NetworkItemDisplay: React.FC<NetworkItemDisplayProps> = ({
  count,
  label,
  size = 'md',
  accent = false,
}) => {
  const [backgroundImage] = useLocalStorage<string>(key.backgroundImage, '');
  const hasBackground = !!backgroundImage;

  return (
    <Card
      className={clsx(
        'backdrop-blur-sm border transition-all duration-300 min-w-0 h-full',
        accent
          ? 'bg-gradient-to-br from-primary-500/90 to-primary-400/80 border-primary-300/40 text-white shadow-md shadow-primary-500/20'
          : hasBackground
            ? 'bg-white/10 dark:bg-black/10 border-white/30 hover:bg-white/20 dark:hover:bg-black/20 hover:-translate-y-0.5'
            : 'bg-white/50 dark:bg-black/30 border-white/50 dark:border-white/10 hover:bg-white/70 dark:hover:bg-black/40 hover:-translate-y-0.5'
      )}
      shadow='none'
    >
      <CardBody className='items-center gap-0.5 p-2 md:p-3'>
        <div
          className={clsx(
            'font-mono font-bold leading-none tabular-nums',
            size === 'md' ? 'text-3xl md:text-4xl' : 'text-2xl md:text-3xl',
            accent || hasBackground
              ? 'text-white drop-shadow-sm'
              : 'text-default-700 dark:text-gray-200'
          )}
        >
          {count}
        </div>
        <div
          className={clsx(
            'whitespace-nowrap text-nowrap flex-shrink-0 font-medium',
            size === 'md' ? 'text-xs md:text-sm' : 'text-[11px]',
            accent
              ? 'text-white/85'
              : hasBackground
                ? 'text-white/80'
                : 'text-default-500'
          )}
        >
          {label}
        </div>
      </CardBody>
    </Card>
  );
};

export default NetworkItemDisplay;
