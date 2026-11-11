import { Card, CardBody, CardFooter, CardHeader } from '@heroui/card';
import { useLocalStorage } from '@uidotdev/usehooks';
import clsx from 'clsx';
import key from '@/const/key';

export interface ContainerProps {
  title: React.ReactNode;
  tag?: React.ReactNode;
  action: React.ReactNode;
  enableSwitch: React.ReactNode;
  children: React.ReactNode;
  className?: string; // Add className prop
}

export interface DisplayCardProps {
  showType?: boolean;
  onEdit: () => void;
  onEnable: () => Promise<void>;
  onDelete: () => Promise<void>;
  onEnableDebug: () => Promise<void>;
}

const DisplayCardContainer: React.FC<ContainerProps> = ({
  title: _title,
  action,
  enableSwitch,
  children,
  className,
}) => {
  const [backgroundImage] = useLocalStorage<string>(key.backgroundImage, '');
  const hasBackground = !!backgroundImage;

  return (
    <Card className={clsx(
      'backdrop-blur-xl border rounded-2xl overflow-hidden transition-all duration-300 h-full',
      hasBackground
        ? 'bg-black/25 border-white/25'
        : 'bg-white/60 dark:bg-white/[0.04] border-white/60 dark:border-white/10',
      'hover:shadow-lg hover:shadow-primary-500/10 hover:-translate-y-0.5',
      className
    )}
    >
      <CardHeader className='p-4 pb-2 flex items-center justify-between gap-3'>
        <div className='flex-1 min-w-0 mr-2'>
          <div className='inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-default-100/60 dark:bg-white/[0.06] border border-white/40 dark:border-white/5'>
            <span className={clsx(
              'w-1.5 h-1.5 rounded-full flex-shrink-0',
              hasBackground ? 'bg-white/70' : 'bg-primary-500'
            )}
            />
            <span className={clsx(
              'font-semibold text-sm truncate select-text',
              hasBackground ? 'text-white' : 'text-default-700 dark:text-white/90'
            )}
            >
              {_title}
            </span>
          </div>
        </div>
        <div className='flex-shrink-0'>{enableSwitch}</div>
      </CardHeader>
      <CardBody className='px-4 py-2 text-sm text-default-600'>{children}</CardBody>
      <CardFooter className='px-4 pb-4 pt-2'>{action}</CardFooter>
    </Card>
  );
};

export default DisplayCardContainer;
