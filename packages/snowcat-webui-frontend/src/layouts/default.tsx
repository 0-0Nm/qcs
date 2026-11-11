import { BreadcrumbItem, Breadcrumbs } from '@heroui/breadcrumbs';
import { Button } from '@heroui/button';
import { Chip } from '@heroui/chip';
import { Image } from '@heroui/image';
import { Tooltip } from '@heroui/tooltip';
import { useLocalStorage } from '@uidotdev/usehooks';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { MdFullscreen, MdFullscreenExit, MdMenu, MdMenuOpen } from 'react-icons/md';
import { useLocation, useNavigate } from 'react-router-dom';

import key from '@/const/key';

import errorFallbackRender from '@/components/error_fallback';
import PageLoading from '@/components/page_loading';
import SideBar from '@/components/sidebar';

import useAuth from '@/hooks/auth';
import useDialog from '@/hooks/use-dialog';

import type { MenuItem } from '@/config/site';
import { siteConfig } from '@/config/site';
import QQManager from '@/controllers/qq_manager';
import ProcessManager from '@/controllers/process_manager';
import { waitForBackendReady } from '@/utils/process_utils';

import logo from '@/assets/images/logo.png';

const menus: MenuItem[] = siteConfig.navItems;

const findTitle = (menus: MenuItem[], pathname: string): string[] => {
  const paths: string[] = [];

  if (pathname) {
    for (const item of menus) {
      if (item.href === pathname) {
        paths.push(item.label);
      } else if (item.items) {
        const title = findTitle(item.items, pathname);

        if (title.length > 0) {
          paths.push(item.label);
          paths.push(...title);
        }
      }
    }
  }

  return paths;
};
const Layout: React.FC<{ children: React.ReactNode; }> = ({ children }) => {
  const location = useLocation();
  const contentRef = useRef<HTMLDivElement>(null);
  const [openSideBar, setOpenSideBar] = useLocalStorage(key.sideBarOpen, true);
  const [b64img] = useLocalStorage(key.backgroundImage, '');
  const navigate = useNavigate();
  const { isAuth, revokeAuth } = useAuth();
  const dialog = useDialog();
  const isOnlineRef = useRef(true);
  const [isRestarting, setIsRestarting] = useState(false);
  // 全屏控制：页面级全屏，用于把控制台铺满整块屏幕
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch (_e) {
      // 部分浏览器 / 嵌入场景禁止全屏，忽略即可
    }
  }, []);

  // 定期检查 QQ 在线状态，掉线时弹窗提示
  useEffect(() => {
    if (!isAuth) return;
    const checkOnlineStatus = async () => {
      const currentPath = location.pathname;
      if (currentPath === '/qq_login' || currentPath === '/web_login') return;
      try {
        const info = await QQManager.getQQLoginInfo();
        if (info?.online === false && isOnlineRef.current === true) {
          isOnlineRef.current = false;
          dialog.confirm({
            title: '账号已离线',
            content: '您的 QQ 账号已掉线，是否重启进程以重新登录？',
            confirmText: '重启进程',
            cancelText: '退出账户',
            onConfirm: async () => {
              setIsRestarting(true);
              try {
                await ProcessManager.restartProcess();
              } catch (_e) {
                // 忽略错误，因为后端正在重启关闭连接
              }

              // 轮询探测后端是否恢复
              await waitForBackendReady(
                15000, // 15秒超时
                () => {
                  setIsRestarting(false);
                  window.location.reload();
                },
                () => {
                  setIsRestarting(false);
                  dialog.alert({
                    title: '启动超时',
                    content: '后端在 15 秒内未响应，请检查 SnowCat 运行日志或手动重启。',
                  });
                }
              );
            },
            onCancel: () => {
              revokeAuth();
              navigate('/web_login');
            },
          });
        } else if (info?.online === true) {
          isOnlineRef.current = true;
        }
      } catch (_e) {
        // 忽略请求错误
      }
    };
    const timer = setInterval(checkOnlineStatus, 5000);
    checkOnlineStatus();
    return () => clearInterval(timer);
  }, [isAuth, location.pathname]);

  const checkIsQQLogin = async () => {
    try {
      const result = await QQManager.checkQQLoginStatus();
      // 掉线状态由 checkOnlineStatus 定期检测并弹窗处理，这里只处理未登录
      if (result.isOffline) {
        // 已登录但掉线，标记状态，等待 checkOnlineStatus 弹窗
        isOnlineRef.current = false;
      } else if (!result.isLogin) {
        // 未登录状态：跳转到登录页面
        if (isAuth) {
          navigate('/qq_login', { replace: true });
        } else {
          navigate('/web_login', { replace: true });
        }
      }
    } catch (_error) {
      navigate('/web_login', { replace: true });
    }
  };
  useEffect(() => {
    contentRef?.current?.scrollTo?.({
      top: 0,
      behavior: 'smooth',
    });
  }, [location.pathname]);
  useEffect(() => {
    if (isAuth) {
      checkIsQQLogin();
    }
  }, [isAuth]);
  const title = useMemo(() => {
    return findTitle(menus, location.pathname);
  }, [location.pathname]);
  const isHome = location.pathname === '/';
  return (
    <div
      className='h-screen relative flex items-stretch overflow-hidden'
      style={{
        backgroundImage: b64img ? `url(${b64img})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <PageLoading loading={isRestarting} />
      <SideBar
        items={menus}
        open={openSideBar}
        onClose={() => setOpenSideBar(false)}
      />
      <motion.div
        layout
        ref={contentRef}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className={clsx(
          'flex-1 overflow-y-auto overflow-x-hidden',
          'transition-all duration-300 ease-in-out',
          'pb-10 md:pb-0'
        )}
      >
        {/* 顶栏：品牌徽章 + 面包屑，吸顶悬浮（雪猫重排） */}
        <header
          className={clsx(
            'sticky top-0 z-30 h-14 px-3 md:px-6 flex items-center gap-3',
            'border-b border-white/50 dark:border-white/[0.06]',
            'shadow-[0_1px_24px_-16px_rgba(15,23,42,0.4)]',
            b64img
              ? 'bg-black/25 backdrop-blur-xl'
              : 'bg-white/60 dark:bg-white/[0.03] backdrop-blur-2xl'
          )}
        >
          <Button
            isIconOnly
            radius='full'
            variant='light'
            size='sm'
            aria-label='切换侧边栏'
            onPress={() => setOpenSideBar(!openSideBar)}
            className='text-default-500 hover:text-primary'
          >
            {openSideBar ? <MdMenuOpen size={22} /> : <MdMenu size={22} />}
          </Button>
          <div className='flex items-center gap-2 min-w-0'>
            <Image
              src={logo}
              alt='SnowCat'
              width={24}
              height={24}
              className='hidden sm:block flex-shrink-0 rounded-md'
            />
            <span
              className={clsx(
                'font-bold tracking-tight text-[15px] hidden sm:inline',
                b64img ? 'text-white' : 'text-default-800 dark:text-white'
              )}
            >
              SnowCat
            </span>
            <Chip
              size='sm'
              variant='flat'
              color='primary'
              className='hidden md:inline-flex h-6 text-[11px] tracking-wider'
            >
              雪猫控制台
            </Chip>
          </div>
          <div className='flex-1 min-w-0 overflow-hidden'>
            <Breadcrumbs
              size='sm'
              classNames={{ list: 'flex-nowrap' }}
            >
              {isHome && (
                <BreadcrumbItem key='home'>
                  <span className='font-semibold'>总览</span>
                </BreadcrumbItem>
              )}
              {title?.map((item, index) => (
                <BreadcrumbItem key={index}>
                  <AnimatePresence mode='wait'>
                    <motion.div
                      key={item}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.25 }}
                      className='font-semibold whitespace-nowrap'
                    >
                      {item}
                    </motion.div>
                  </AnimatePresence>
                </BreadcrumbItem>
              ))}
            </Breadcrumbs>
          </div>
          <Tooltip content='WebSocket / HTTP 双调试台在「接口调试」与「实时调试」' placement='bottom'>
            <span className='hidden xl:inline text-tiny text-default-400 whitespace-nowrap'>
              OneBot v11 · 融合自持版
            </span>
          </Tooltip>
          <Tooltip content={isFullscreen ? '退出全屏' : '全屏显示'} placement='bottom'>
            <Button
              isIconOnly
              radius='full'
              variant='light'
              size='sm'
              aria-label={isFullscreen ? '退出全屏' : '全屏显示'}
              onPress={toggleFullscreen}
              className='text-default-500 hover:text-primary'
            >
              {isFullscreen ? <MdFullscreenExit size={22} /> : <MdFullscreen size={22} />}
            </Button>
          </Tooltip>
        </header>
        <ErrorBoundary fallbackRender={errorFallbackRender}>
          {children}
        </ErrorBoundary>
      </motion.div>
    </div>
  );
};

export default Layout;
