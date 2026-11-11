import { Card, CardBody } from '@heroui/card';
import { useLocalStorage } from '@uidotdev/usehooks';
import clsx from 'clsx';
import { BiSolidMemoryCard } from 'react-icons/bi';
import { GiCpu } from 'react-icons/gi';

import key from '@/const/key';

import UsagePie from './usage_pie';

export interface SystemStatusItemProps {
  title: string;
  value?: string | number;
  size?: 'md' | 'lg';
  unit?: string;
  hasBackground?: boolean;
}

const SystemStatusItem: React.FC<SystemStatusItemProps> = ({
  title,
  value = '-',
  size = 'md',
  unit,
  hasBackground = false,
}) => {
  return (
    <div
      className={clsx(
        'py-1 text-[13px] transition-colors flex items-center gap-2',
        size === 'lg' ? 'col-span-2' : 'col-span-1'
      )}
    >
      <div className={clsx(
        'flex-shrink-0 font-medium',
        size === 'lg' ? 'w-14' : 'w-16',
        hasBackground ? 'text-white/85' : 'text-default-500 dark:text-gray-400'
      )}
      >{title}
      </div>
      <div className={clsx(
        'font-mono text-[11px] tabular-nums truncate flex-1 text-left',
        hasBackground ? 'text-white/85' : 'text-default-700 dark:text-gray-200'
      )}
      >
        {value}
        {unit && <span className='ml-0.5 opacity-70'>{unit}</span>}
      </div>
    </div>
  );
};

export interface SystemStatusDisplayProps {
  data?: SystemStatus;
}

const SystemStatusDisplay: React.FC<SystemStatusDisplayProps> = ({ data }) => {
  const memoryUsage = {
    system: 0,
    qq: 0,
  };
  if (data) {
    const system = Number(data.memory.total) || 1;
    const systemUsage = Number(data.memory.usage.system);
    const qqUsage = Number(data.memory.usage.qq);
    memoryUsage.system = (systemUsage / system) * 100;
    memoryUsage.qq = (qqUsage / system) * 100;
  }
  const [backgroundImage] = useLocalStorage<string>(key.backgroundImage, '');
  const hasBackground = !!backgroundImage;

  return (
    <Card className={clsx(
      'backdrop-blur-sm border border-white/40 dark:border-white/10 shadow-sm relative overflow-hidden flex-1',
      hasBackground ? 'bg-black/25 dark:bg-black/30' : 'bg-white/60 dark:bg-white/[0.04]'
    )}
    >
      <CardBody className='overflow-visible md:flex-row gap-4 items-center justify-stretch z-10'>
        <div className='flex-1 w-full md:max-w-none md:flex-[1.4] space-y-3'>
          <div className={clsx(
            'rounded-2xl p-3 border',
            hasBackground
              ? 'bg-white/[0.06] border-white/15'
              : 'bg-white/45 dark:bg-white/[0.03] border-white/60 dark:border-white/[0.06]'
          )}
          >
            <h2 className={clsx(
              'text-sm font-semibold flex items-center gap-2 mb-1.5',
              hasBackground ? 'text-white drop-shadow-sm' : 'text-default-700 dark:text-gray-200'
            )}
            >
              <span className={clsx(
                'w-6 h-6 rounded-lg flex items-center justify-center',
                hasBackground ? 'bg-white/15' : 'bg-primary-500/10 text-primary-500'
              )}
              >
                <GiCpu size={14} />
              </span>
              <span>处理器</span>
            </h2>
            <div className='grid grid-cols-2 gap-x-3 gap-y-0'>
              <SystemStatusItem title='型号' value={data?.cpu.model} size='lg' hasBackground={hasBackground} />
              <SystemStatusItem title='内核数' value={data?.cpu.core} hasBackground={hasBackground} />
              <SystemStatusItem title='主频' value={data?.cpu.speed} unit='GHz' hasBackground={hasBackground} />
              <SystemStatusItem
                title='使用率'
                value={data?.cpu.usage.system}
                unit='%'
                hasBackground={hasBackground}
              />
              <SystemStatusItem
                title='QQ主线程'
                value={data?.cpu.usage.qq}
                unit='%'
                hasBackground={hasBackground}
              />
            </div>
          </div>

          <div className={clsx(
            'rounded-2xl p-3 border',
            hasBackground
              ? 'bg-white/[0.06] border-white/15'
              : 'bg-white/45 dark:bg-white/[0.03] border-white/60 dark:border-white/[0.06]'
          )}
          >
            <h2 className={clsx(
              'text-sm font-semibold flex items-center gap-2 mb-1.5',
              hasBackground ? 'text-white drop-shadow-sm' : 'text-default-700 dark:text-gray-200'
            )}
            >
              <span className={clsx(
                'w-6 h-6 rounded-lg flex items-center justify-center',
                hasBackground ? 'bg-white/15' : 'bg-secondary-500/10 text-secondary-500'
              )}
              >
                <BiSolidMemoryCard size={14} />
              </span>
              <span>内存</span>
            </h2>
            <div className='grid grid-cols-2 gap-x-3 gap-y-0'>
              <SystemStatusItem
                title='总量'
                value={data?.memory.total}
                size='lg'
                unit='MB'
                hasBackground={hasBackground}
              />
              <SystemStatusItem
                title='使用量'
                value={data?.memory.usage.system}
                unit='MB'
                hasBackground={hasBackground}
              />
              <SystemStatusItem
                title='QQ主线程'
                value={data?.memory.usage.qq}
                unit='MB'
                hasBackground={hasBackground}
              />
            </div>
          </div>
        </div>
        <div className='flex flex-row gap-2 flex-shrink-0 w-full justify-center mt-3 md:mt-0 md:w-auto md:self-center'>
          <UsagePie
            systemUsage={Number(data?.cpu.usage.system) || 0}
            processUsage={Number(data?.cpu.usage.qq) || 0}
            title='CPU'
            hasBackground={hasBackground}
          />
          <UsagePie
            systemUsage={memoryUsage.system}
            processUsage={memoryUsage.qq}
            title='内存'
            hasBackground={hasBackground}
          />
        </div>
      </CardBody>
    </Card>
  );
};
export default SystemStatusDisplay;
