import { Tab, Tabs } from '@heroui/tabs';
import { Button } from '@heroui/button';
import { Spinner } from '@heroui/spinner';
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { IoMdRefresh } from 'react-icons/io';
import { MdExtension } from 'react-icons/md';

import EmptyState from '@/components/empty_state';
import PageHeader from '@/components/page_header';
import PageLoading from '@/components/page_loading';
import pluginManager from '@/controllers/plugin_manager';

interface ExtensionPage {
  pluginId: string;
  pluginName: string;
  path: string;
  title: string;
  icon?: string;
  description?: string;
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
export default function ExtensionPage () {
  const [loading, setLoading] = useState(true);
  const [extensionPages, setExtensionPages] = useState<ExtensionPage[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>('');
  const [iframeLoading, setIframeLoading] = useState(false);

  const fetchExtensionPages = async () => {
    setLoading(true);
    try {
      const result = await pluginManager.getPluginList();
      if (result.pluginManagerNotFound) {
        setExtensionPages([]);
      } else {
        setExtensionPages(result.extensionPages || []);
        // 默认选中第一个
        if (result.extensionPages?.length > 0 && !selectedTab) {
          setSelectedTab(`${result.extensionPages[0].pluginId}:${result.extensionPages[0].path}`);
        }
      }
    } catch (error) {
      const msg = (error as Error).message;
      toast.error(`获取扩展页面失败: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    await fetchExtensionPages();
  };

  // 生成 tabs
  const tabs = useMemo(() => {
    return extensionPages.map(page => ({
      key: `${page.pluginId}:${page.path}`,
      title: page.title,
      pluginId: page.pluginId,
      pluginName: page.pluginName,
      path: page.path,
      icon: page.icon,
      description: page.description,
    }));
  }, [extensionPages]);

  // 获取当前选中页面的 iframe URL
  // 新路由格式不需要鉴权: /plugin/:pluginId/page/:pagePath
  const currentPageUrl = useMemo(() => {
    if (!selectedTab) return '';
    const [pluginId, ...pathParts] = selectedTab.split(':');
    const path = pathParts.join(':').replace(/^\//, '');
    return `/plugin/${pluginId}/page/${path}`;
  }, [selectedTab]);

  useEffect(() => {
    fetchExtensionPages();
  }, []);

  useEffect(() => {
    if (currentPageUrl) {
      setIframeLoading(true);
    }
  }, [currentPageUrl]);

  const handleIframeLoad = () => {
    setIframeLoading(false);
  };

  // 在新窗口打开页面（新路由不需要鉴权）
  const openInNewWindow = (pluginId: string, path: string) => {
    const cleanPath = path.replace(/^\//, '');
    const url = `/plugin/${pluginId}/page/${cleanPath}`;
    window.open(url, '_blank');
  };

  // 拖拽滚动支持（鼠标 + 触摸）
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    isDragging.current = true;
    startX.current = e.clientX;
    scrollLeft.current = el.scrollLeft;
    el.setPointerCapture(e.pointerId);
    el.style.cursor = 'grabbing';
    el.style.userSelect = 'none';
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    const dx = e.clientX - startX.current;
    scrollRef.current.scrollLeft = scrollLeft.current - dx;
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    isDragging.current = false;
    scrollRef.current.releasePointerCapture(e.pointerId);
    scrollRef.current.style.cursor = 'grab';
    scrollRef.current.style.userSelect = '';
  }, []);

  return (
    <>
      <title>扩展页面 - SnowCat WebUI</title>
      <div className='sc-page h-[calc(100vh-3.5rem)] flex flex-col'>
        <PageLoading loading={loading} />

        <PageHeader
          icon={<MdExtension size={20} />}
          title='扩展页面'
          description='插件注册的扩展界面，可直接在控制台内打开'
          accent='secondary'
          actions={
            <Button
              isIconOnly
              className='bg-white/60 dark:bg-white/10 text-default-600 dark:text-default-300 backdrop-blur-md hover:bg-white/80 dark:hover:bg-white/20'
              radius='full'
              onPress={refresh}
            >
              <IoMdRefresh size={22} />
            </Button>
          }
        />

        {extensionPages.length > 0 && (
          <div
            ref={scrollRef}
            className='overflow-x-auto min-w-0 w-full mb-3 scrollbar-thin scrollbar-thumb-default-300 scrollbar-track-transparent cursor-grab touch-pan-x'
            style={{ WebkitOverflowScrolling: 'touch' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <Tabs
              aria-label='Extension Pages'
              className='w-max min-w-full'
              selectedKey={selectedTab}
              onSelectionChange={(key) => setSelectedTab(key as string)}
              classNames={{
                tabList: 'sc-tablist flex-nowrap',
                cursor: 'sc-tab-cursor',
                panel: 'hidden',
              }}
            >
                {tabs.map((tab) => (
                  <Tab
                    key={tab.key}
                    title={
                      <div className='flex items-center gap-2 whitespace-nowrap'>
                        {tab.icon && <span>{tab.icon}</span>}
                        <span
                          className='cursor-pointer hover:underline truncate max-w-[6rem] md:max-w-none'
                          title={`插件：${tab.pluginName}\n点击在新窗口打开`}
                          onClick={(e) => {
                            e.stopPropagation();
                            openInNewWindow(tab.pluginId, tab.path);
                          }}
                        >
                          {tab.title}
                        </span>
                        <span className='text-xs text-default-400 hidden md:inline'>({tab.pluginName})</span>
                      </div>
                    }
                  />
                ))}
              </Tabs>
            </div>
          )}

        {extensionPages.length === 0 && !loading
          ? (
            <EmptyState
              icon={<MdExtension size={22} />}
              title='暂无插件扩展页面'
              description='插件可以通过注册页面来扩展 WebUI 功能，注册后会在这里出现。'
              className='flex-1'
            />
          )
          : (
            <div className='flex-1 min-h-0 sc-panel overflow-hidden relative'>
              {iframeLoading && (
                <div className='absolute inset-0 flex items-center justify-center bg-white/40 dark:bg-black/30 backdrop-blur-sm z-10'>
                  <Spinner size='lg' />
                </div>
              )}
              {/*
                插件页面由本站 /plugin/:id/page/* 同源提供，本身就运行在同一 origin 下。
                此前 sandbox 同时给了 allow-scripts + allow-same-origin，
                等价于沙箱可被自身解除，浏览器会持续告警且毫无隔离收益；
                这里直接不设 sandbox，让插件页面正常使用同源存储与接口。
              */}
              <iframe
                src={currentPageUrl}
                className='w-full h-full border-0'
                onLoad={handleIframeLoad}
                title='extension-page'
                allow='clipboard-read; clipboard-write; fullscreen'
              />
            </div>
          )}
      </div>
    </>
  );
}
