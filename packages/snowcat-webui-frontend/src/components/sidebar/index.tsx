import { Button } from '@heroui/button';
import { Divider } from '@heroui/divider';
import { Image } from '@heroui/image';
import { useLocalStorage } from '@uidotdev/usehooks';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'motion/react';
import React from 'react';
import { IoMdLogOut } from 'react-icons/io';
import { MdDarkMode, MdLightMode } from 'react-icons/md';

import key from '@/const/key';
import logo from '@/assets/images/logo.png';
import useAuth from '@/hooks/auth';
import useDialog from '@/hooks/use-dialog';
import { useTheme } from '@/hooks/use-theme';
import type { MenuItem } from '@/config/site';

import Menus from './menus';

interface SideBarProps {
  open: boolean;
  items: MenuItem[];
  onClose?: () => void;
}

const SideBar: React.FC<SideBarProps> = (props) => {
  const { open, items, onClose } = props;
  const { toggleTheme, isDark } = useTheme();
  const { revokeAuth } = useAuth();
  const dialog = useDialog();
  const [backgroundImage] = useLocalStorage<string>(key.backgroundImage, '');
  const hasBackground = !!backgroundImage;

  const onRevokeAuth = () => {
    dialog.confirm({
      title: '退出登录',
      content: '确定要退出登录吗？',
      onConfirm: revokeAuth,
    });
  };
  return (
    <>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className='fixed inset-y-0 left-64 right-0 bg-black/20 backdrop-blur-[1px] z-40 md:hidden'
            aria-hidden='true'
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.2, delay: 0.15 }}
          />
        )}
      </AnimatePresence>
      <motion.div
        className={clsx(
          'overflow-hidden fixed top-0 left-0 h-full z-50 md:static md:shadow-none rounded-r-2xl md:rounded-none',
          hasBackground
            ? 'bg-black/25 backdrop-blur-xl'
            : 'bg-white/55 dark:bg-white/[0.03] backdrop-blur-2xl border-r border-white/60 dark:border-white/[0.06] shadow-[8px_0_30px_-24px_rgba(15,23,42,0.35)]',
          'md:border-r-0 md:shadow-none'
        )}
        initial={{ width: 0 }}
        animate={{ width: open ? '16rem' : 0 }}
        transition={{
          type: open ? 'spring' : 'tween',
          stiffness: 150,
          damping: open ? 15 : 10,
        }}
        style={{ overflow: 'hidden' }}
      >
        <motion.div className='w-64 flex flex-col items-stretch h-full transition-transform duration-300 ease-in-out z-30 relative float-right p-3'>
          <div className='flex items-center justify-start gap-3 px-2 my-5 ml-1'>
            <div className='relative flex-shrink-0'>
              <div
                className={clsx(
                  'absolute inset-0 rounded-xl blur-md opacity-70',
                  hasBackground ? 'bg-white/40' : 'bg-primary-300/50'
                )}
              />
              <Image
                src={logo}
                alt='SnowCat'
                width={34}
                height={34}
                className='relative flex-shrink-0 rounded-xl'
              />
            </div>
            <div className='flex flex-col min-w-0'>
              <div className={clsx(
                'text-lg font-bold tracking-wide select-none leading-tight',
                hasBackground ? 'text-white' : 'text-default-900 dark:text-white'
              )}
              >
                SnowCat
              </div>
              <div className={clsx(
                'text-tiny select-none leading-tight tracking-[0.18em]',
                hasBackground ? 'text-white/60' : 'text-default-400'
              )}
              >
                雪猫控制台
              </div>
            </div>
          </div>
          <Divider className='opacity-20 mb-1' />
          <div className='overflow-y-auto flex flex-col flex-1 px-1 pt-2 hide-scrollbar'>
            <Menus items={items} />
            <div className='mt-auto mb-8 md:mb-2 space-y-2 px-1'>
              <Button
                className={clsx(
                  'w-full font-medium transition-all duration-300 rounded-xl justify-start px-3',
                  hasBackground
                    ? 'bg-white/10 text-white hover:bg-white/20'
                    : 'bg-default-100/60 text-default-600 hover:bg-default-200/70 dark:bg-white/[0.06] dark:text-default-300'
                )}
                variant='flat'
                onPress={toggleTheme}
                startContent={
                  !isDark ? <MdLightMode size={17} /> : <MdDarkMode size={17} />
                }
              >
                {isDark ? '切换浅色' : '切换深色'}
              </Button>
              <Button
                className={clsx(
                  'w-full mb-2 font-medium transition-all duration-300 rounded-xl justify-start px-3',
                  hasBackground
                    ? 'bg-danger-500/20 text-white hover:bg-danger-500/30'
                    : 'bg-danger-50/70 text-danger-500 hover:bg-danger-100/80 dark:bg-danger-900/20 dark:text-danger-300'
                )}
                variant='flat'
                onPress={onRevokeAuth}
                startContent={<IoMdLogOut size={17} />}
              >
                退出登录
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
};

export default SideBar;
