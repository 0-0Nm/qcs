import { Link } from '@heroui/link';
import { Tooltip } from '@heroui/tooltip';

import { GithubIcon } from '@/components/icons';

export default function PureLayout ({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className='relative flex flex-col h-screen'>
      <div className='absolute right-0 top-0 p-3 z-10'>
        <Tooltip content='查看 WebUI 源码' placement='left' showArrow>
          <Link isExternal href='https://github.com/DandanLLab/SnowCatQQ'>
            <GithubIcon className='text-default-400 hover:text-primary w-7 h-7 transition-all hover:-translate-y-0.5' />
          </Link>
        </Tooltip>
      </div>
      <main className='flex-grow w-full flex flex-col justify-center items-center px-3'>
        {children}
      </main>
      <div className='absolute bottom-0 inset-x-0 pb-4 text-center pointer-events-none'>
        <span className='text-[10px] tracking-[0.3em] uppercase text-default-300 dark:text-default-600'>
          SnowCat · 雪猫控制台
        </span>
      </div>
    </div>
  );
}
