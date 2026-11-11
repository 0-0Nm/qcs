import { Avatar } from '@heroui/avatar';
import { Card, CardBody } from '@heroui/card';
import { Chip } from '@heroui/chip';
import { useLocalStorage } from '@uidotdev/usehooks';
import clsx from 'clsx';
import { BsTencentQq } from 'react-icons/bs';

import key from '@/const/key';
import { SelfInfo } from '@/types/user';

import PageLoading from './page_loading';

export interface QQInfoCardProps {
  data?: SelfInfo;
  error?: Error;
  loading?: boolean;
}

const QQInfoCard: React.FC<QQInfoCardProps> = ({ data, error, loading }) => {
  const [backgroundImage] = useLocalStorage<string>(key.backgroundImage, '');
  const hasBackground = !!backgroundImage;
  return (
    <Card
      className={clsx(
        'relative backdrop-blur-xl border overflow-hidden flex-shrink-0 transition-all duration-300 rounded-2xl',
        hasBackground
          ? 'bg-black/25 dark:bg-black/30 border-white/25'
          : 'bg-white/60 dark:bg-white/[0.04] border-white/60 dark:border-white/10',
        'hover:shadow-lg hover:shadow-primary-500/10'
      )}
      shadow='none'
    >
      <PageLoading loading={loading} />
      {error
        ? (
          <CardBody className='items-start gap-1 justify-center p-4'>
            <div className='text-tiny font-semibold uppercase tracking-widest text-danger-500'>
              账号信息获取失败
            </div>
            <div className='text-small text-default-500 break-all'>
              {error.message}
            </div>
          </CardBody>
        )
        : (
          <CardBody className='flex-row items-center gap-3.5 overflow-hidden relative p-4'>
            {!hasBackground && (
              <div className='absolute right-[-14px] bottom-[-18px] text-[86px] text-primary-500/[0.06] rotate-12 pointer-events-none'>
                <BsTencentQq />
              </div>
            )}
            <div className='relative flex-shrink-0 z-10'>
              <div
                className={clsx(
                  'rounded-full p-[2px]',
                  data?.online
                    ? 'bg-gradient-to-br from-primary-400 to-secondary-400'
                    : 'bg-default-200 dark:bg-white/10'
                )}
              >
                <Avatar
                  src={data?.avatarUrl || undefined}
                  name={data?.nick || data?.uin || '?'}
                  className='w-14 h-14 text-base font-bold bg-white dark:bg-zinc-800'
                  isBordered={false}
                />
              </div>
              <div
                className={clsx(
                  'w-3.5 h-3.5 rounded-full absolute right-0.5 bottom-0.5 border-2 border-white dark:border-zinc-900 z-10 transition-colors',
                  data?.online ? 'bg-success-500' : 'bg-default-400'
                )}
              />
            </div>
            <div className='flex-col justify-center z-10 min-w-0 flex-1'>
              <div className='flex items-center gap-2 mb-0.5'>
                <div className={clsx(
                  'text-lg font-bold truncate',
                  hasBackground ? 'text-white drop-shadow-sm' : 'text-default-800 dark:text-gray-100'
                )}
                >
                  {data?.nick || '未知用户'}
                </div>
                <Chip
                  size='sm'
                  variant='flat'
                  color={data?.online ? 'success' : 'default'}
                  className='h-5 flex-shrink-0'
                  classNames={{ content: 'text-[10px] px-1 font-medium' }}
                >
                  {data?.online ? '在线' : '离线'}
                </Chip>
              </div>
              <div className={clsx(
                'font-mono text-xs tracking-wider',
                hasBackground ? 'text-white/70' : 'text-default-400'
              )}
              >
                {data?.uin || 'Unknown'}
              </div>
            </div>
          </CardBody>
        )}
    </Card>
  );
};

export default QQInfoCard;
