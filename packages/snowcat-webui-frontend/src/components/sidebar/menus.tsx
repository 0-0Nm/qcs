import { Button } from '@heroui/button';
import { Image } from '@heroui/image';
import { useLocalStorage } from '@uidotdev/usehooks';
import clsx from 'clsx';
import React from 'react';
import { matchPath, useLocation, useNavigate } from 'react-router-dom';

import key from '@/const/key';

import type { MenuItem } from '@/config/site';

const renderItems = (items: MenuItem[], _children = false) => {
  return items?.map((item) => {
    const navigate = useNavigate();
    const locate = useLocation();
    const [open, setOpen] = React.useState(!!item.autoOpen);
    const canOpen = React.useMemo(
      () => item.items && item.items.length > 0,
      [item.items]
    );
    const [b64img] = useLocalStorage(key.backgroundImage, '');
    const [customIcons] = useLocalStorage<Record<string, string>>(
      key.customIcons,
      {}
    );
    const isActive = React.useMemo(() => {
      if (item.href) {
        return !!matchPath(item.href, locate.pathname);
      }

      return false;
    }, [item.href, locate.pathname]);

    const goTo = (href: string) => {
      navigate(href);
    };

    React.useEffect(() => {
      if (item.items) {
        const shouldOpen = item.items.some(
          (item) => item?.href && !!matchPath(item.href, locate.pathname)
        );

        if (shouldOpen) setOpen(true);
      }
    }, [item.items, locate.pathname]);
    const panelRef = React.useRef<HTMLDivElement>(null);

    return (
      <div key={item.href + item.label}>
        <Button
          className={clsx(
            'group relative flex items-center w-full h-10 text-left justify-start rounded-xl px-3',
            'transition-all duration-200',
            isActive
              ? 'bg-primary-500/[0.12] text-primary-600 dark:bg-primary-500/[0.16] dark:text-primary-300 font-semibold shadow-sm shadow-primary-500/10'
              : 'text-default-600 hover:bg-default-100/70 hover:text-default-900 dark:text-default-300 dark:hover:bg-white/[0.06]',
            b64img && !isActive && 'text-white/85 hover:bg-white/15 hover:text-white',
            // 选中态左侧指示条
            isActive && 'before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-[3px] before:rounded-full before:bg-primary-500'
          )}
          color='default'
          disableRipple
          endContent={
            canOpen
              ? (
                <div
                  className={clsx(
                    'ml-auto relative w-3 h-3 transition-transform duration-300',
                    open && 'transform rotate-180',
                    isActive
                      ? 'text-primary-500'
                      : 'text-default-300 dark:text-white/40',
                    'before:rounded-full',
                    'before:content-[""]',
                    'before:block',
                    'before:absolute',
                    'before:w-3',
                    'before:h-[4.5px]',
                    'before:bg-current',
                    'before:top-1/2',
                    'before:-left-[3px]',
                    'before:transform',
                    'before:-translate-y-1/2',
                    'before:rotate-45',
                    'after:rounded-full',
                    'after:content-[""]',
                    'after:block',
                    'after:absolute',
                    'after:w-3',
                    'after:h-[4.5px]',
                    'after:bg-current',
                    'after:top-1/2',
                    'after:left-[3px]',
                    'after:transform',
                    'after:-translate-y-1/2',
                    'after:-rotate-45'
                  )}
                />
              )
              : (
                <div
                  className={clsx(
                    'ml-auto rounded-full transition-all duration-300',
                    isActive
                      ? 'w-1.5 h-1.5 bg-primary-500'
                      : 'w-1 h-1 bg-default-300 dark:bg-white/25 group-hover:bg-primary-300'
                  )}
                  aria-hidden='true'
                />
              )
          }
          startContent={
            customIcons[item.label]
              ? (
                <Image
                  radius='none'
                  src={customIcons[item.label]}
                  alt={item.label}
                  className='w-[18px] h-[18px] flex-shrink-0'
                />
              )
              : (
                <span className={clsx(
                  'flex-shrink-0 transition-transform duration-200 group-hover:scale-110',
                  isActive ? 'text-primary-500' : 'opacity-80'
                )}
                >
                  {item.icon}
                </span>
              )
          }
          variant='light'
          onPress={() => {
            if (item.href) {
              if (!isActive) {
                goTo(item.href);
              }
            } else if (canOpen) {
              setOpen(!open);
            }
          }}
        >
          <span className='text-sm'>{item.label}</span>
        </Button>
        <div
          ref={panelRef}
          className='ml-4 overflow-hidden transition-all duration-300'
          style={{
            height: open ? panelRef.current?.scrollHeight : 0,
          }}
        >
          {item.items && renderItems(item.items, true)}
        </div>
      </div>
    );
  });
};

interface MenusProps {
  items: MenuItem[];
}
const Menus: React.FC<MenusProps> = (props) => {
  const { items } = props;

  return (
    <div className='flex flex-col justify-content-center flex-1 gap-2'>
      {renderItems(items)}
    </div>
  );
};

export default Menus;
