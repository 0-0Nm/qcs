import { Card, CardBody } from '@heroui/card';
import { Chip } from '@heroui/chip';
import { Divider } from '@heroui/divider';
import { useLocalStorage } from '@uidotdev/usehooks';
import { useRequest } from 'ahooks';
import clsx from 'clsx';
import { useCallback, useEffect, useRef } from 'react';
import key from '@/const/key';

import toast from 'react-hot-toast';
import { HiOutlineBolt } from 'react-icons/hi2';
import { LuSignal } from 'react-icons/lu';

import NetworkItemDisplay from '@/components/display_network_item';
import Hitokoto from '@/components/hitokoto';
import QQInfoCard from '@/components/qq_info_card';
import SystemInfo from '@/components/system_info';
import SystemStatusDisplay from '@/components/system_status_display';

import useConfig from '@/hooks/use-config';

import QQManager from '@/controllers/qq_manager';
import WebUIManager from '@/controllers/webui_manager';

import { getNetworkList } from '@/utils/config';

const Networks: React.FC = () => {
  const { config, refreshConfig } = useConfig();
  const httpServers = getNetworkList(config, 'httpServers');
  const httpClients = getNetworkList(config, 'httpClients');
  const websocketServers = getNetworkList(config, 'websocketServers');
  const websocketClients = getNetworkList(config, 'websocketClients');
  const httpSseServers = getNetworkList(config, 'httpSseServers');
  const mcpServers = getNetworkList(config, 'mcpServers');

  const allNetWorkConfigLength =
    httpClients.length +
    websocketClients.length +
    websocketServers.length +
    httpServers.length +
    httpSseServers.length +
    mcpServers.length;

  useEffect(() => {
    refreshConfig();
  }, []);
  return (
    <Card
      className={clsx(
        'backdrop-blur-md border border-white/40 dark:border-white/10 shadow-sm',
        'bg-white/60 dark:bg-white/[0.04]'
      )}
      shadow='none'
    >
      <CardBody className='p-4 gap-3'>
        <div className='flex items-center gap-2'>
          <LuSignal className='text-primary' size={16} />
          <span className='text-small font-semibold text-default-700 dark:text-default-200'>接入点总览</span>
          <Chip size='sm' variant='flat' color='primary' className='h-6'>
            {allNetWorkConfigLength} 条
          </Chip>
          <Divider className='flex-1 opacity-40' />
        </div>
        <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3'>
          <NetworkItemDisplay count={allNetWorkConfigLength} label='全部接入点' accent />
          <NetworkItemDisplay count={httpServers.length} label='HTTP 服务器' />
          <NetworkItemDisplay count={httpClients.length} label='HTTP 客户端' />
          <NetworkItemDisplay count={websocketServers.length} label='WS 服务器' />
          <NetworkItemDisplay count={websocketClients.length} label='WS 客户端' />
          <NetworkItemDisplay count={mcpServers.length} label='MCP 服务器' />
        </div>
      </CardBody>
    </Card>
  );
};

const QQInfo: React.FC = () => {
  const { data, loading, error } = useRequest(QQManager.getQQLoginInfo);
  return <QQInfoCard data={data} error={error} loading={loading} />;
};

export interface SystemStatusCardProps {
  setArchInfo: (arch: string | undefined) => void;
}
const SystemStatusCard: React.FC<SystemStatusCardProps> = ({ setArchInfo }) => {
  const [systemStatus, setSystemStatus] = useLocalStorage<SystemStatus | undefined>('snowcat_system_status_cache', undefined);
  const isSetted = useRef(false);
  const getStatus = useCallback(() => {
    try {
      const event = WebUIManager.getSystemStatus(setSystemStatus);
      return event;
    } catch (_error) {
      toast.error('获取系统状态失败');
    }
  }, []);

  useEffect(() => {
    const close = getStatus();
    return () => {
      close?.close();
    };
  }, [getStatus]);

  useEffect(() => {
    if (systemStatus?.arch && !isSetted.current) {
      setArchInfo(systemStatus.arch);
      isSetted.current = true;
    }
  }, [systemStatus, setArchInfo]);

  return <SystemStatusDisplay data={systemStatus} />;
};

const DashboardIndexPage: React.FC = () => {
  const [archInfo, setArchInfo] = useLocalStorage<string | undefined>('snowcat_arch_info_cache', undefined);
  // @ts-ignore
  const [backgroundImage] = useLocalStorage<string>(key.backgroundImage, '');
  const hasBackground = !!backgroundImage;

  return (
    <>
      <title>总览 - SnowCat WebUI · 雪猫控制台</title>
      <section className='w-full px-3 md:px-6 py-4 md:py-6 overflow-hidden'>
        {/* 页首横幅：雪猫品牌带（全宽） */}
        <div
          className={clsx(
            'mb-4 rounded-2xl px-5 py-4 flex flex-wrap items-center justify-between gap-4',
            'bg-gradient-to-r from-primary-100/70 via-primary-50/40 to-transparent',
            'dark:from-primary-900/30 dark:via-primary-900/10 dark:to-transparent',
            'border border-primary-100/50 dark:border-primary-900/30'
          )}
        >
          <div className='min-w-0'>
            <h1 className='text-xl font-bold text-default-900 dark:text-white flex items-center gap-2'>
              <HiOutlineBolt className='text-primary' />
              雪猫运行总览
            </h1>
            <p className='text-tiny text-default-500 mt-1'>
              账号 · 系统 · 接入点 一屏尽览（NapCat + SnowLuma 融合自持版）
            </p>
          </div>
          <Chip variant='flat' color='secondary' size='sm' className='flex-shrink-0'>
            SnowCat.Onebot
          </Chip>
        </div>

        {/* 主体：三段式全宽栅格 */}
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch'>
          <div className='lg:col-span-4 xl:col-span-3 flex flex-col gap-4 min-w-0'>
            <QQInfo />
            <SystemInfo archInfo={archInfo} />
          </div>
          <div className='lg:col-span-8 xl:col-span-9 flex flex-col gap-4 min-w-0'>
            <SystemStatusCard setArchInfo={setArchInfo} />
            <Networks />
          </div>
        </div>

        <Card
          className={clsx(
            'mt-4 backdrop-blur-sm border border-white/40 dark:border-white/10 shadow-sm transition-all overflow-hidden',
            hasBackground ? 'bg-black/25 dark:bg-black/30' : 'bg-white/60 dark:bg-white/[0.04]'
          )}
        >
          <CardBody className='overflow-hidden'>
            <Hitokoto />
          </CardBody>
        </Card>
      </section>
    </>
  );
};

export default DashboardIndexPage;
