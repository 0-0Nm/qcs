import { Card, CardBody } from '@heroui/card';
import { Tab, Tabs } from '@heroui/tabs';
import { useLocalStorage } from '@uidotdev/usehooks';
import clsx from 'clsx';
import { useNavigate, useSearchParams } from 'react-router-dom';

import key from '@/const/key';

// 把修改密码移动到WebUI栏目中
// import ChangePasswordCard from './change_password';
import LoginConfigCard from './login';
import OneBotConfigCard from './onebot';
import ServerConfigCard from './server';
import SSLConfigCard from './ssl';
import ThemeConfigCard from './theme';
import WebUIConfigCard from './webui';
import BackupConfigCard from './backup';
import BypassConfigCard from './bypass';
import CoreConfigCard from './core';

export interface ConfigPageProps {
  children?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const ConfigPageItem: React.FC<ConfigPageProps> = ({
  children,
  size = 'md',
}) => {
  const [backgroundImage] = useLocalStorage<string>(key.backgroundImage, '');
  const hasBackground = !!backgroundImage;

  return (
    <Card className={clsx(
      'w-full mx-auto backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl transition-all shadow-sm',
      hasBackground ? 'bg-black/20' : 'bg-white/65 dark:bg-white/[0.04]',
      {
        'max-w-xl': size === 'sm',
        'max-w-3xl': size === 'md',
        'max-w-[1400px]': size === 'lg',
      }
    )}
    >
      <CardBody className='py-6 px-4 md:py-8 md:px-12'>
        <div className='w-full flex flex-col gap-5'>
          {children}
        </div>
      </CardBody>
    </Card>
  );
};

export default function ConfigPage () {
  const navigate = useNavigate();
  const search = useSearchParams({
    tab: 'onebot',
  })[0];
  const tab = search.get('tab') ?? 'onebot';

  return (
    <section className='sc-page'>
      <title>系统配置 - SnowCat WebUI</title>
      <Tabs
        aria-label='config tab'
        fullWidth={false}
        className='w-full'
        selectedKey={tab}
        onSelectionChange={(key) => {
          navigate(`/config?tab=${key}`);
        }}
        classNames={{
          base: 'w-full flex-col items-center',
          tabList: 'sc-tablist mb-4 md:mb-6 w-full md:w-fit mx-auto overflow-x-auto hide-scrollbar',
          cursor: 'sc-tab-cursor',
          tab: 'h-9 px-4 md:px-6',
          tabContent: 'text-default-600 dark:text-default-300 font-medium group-data-[selected=true]:text-primary',
          panel: 'w-full relative p-0',
        }}
      >
        <Tab title='OneBot配置' key='onebot'>
          <ConfigPageItem>
            <OneBotConfigCard />
          </ConfigPageItem>
        </Tab>
        <Tab title='服务器配置' key='server'>
          <ConfigPageItem>
            <ServerConfigCard />
          </ConfigPageItem>
        </Tab>
        <Tab title='SSL配置' key='ssl'>
          <ConfigPageItem size='sm'>
            <SSLConfigCard />
          </ConfigPageItem>
        </Tab>
        <Tab title='WebUI配置' key='webui'>
          <ConfigPageItem>
            <WebUIConfigCard />
          </ConfigPageItem>
        </Tab>
        <Tab title='登录配置' key='login'>
          <ConfigPageItem>
            <LoginConfigCard />
          </ConfigPageItem>
        </Tab>
        {/* 把修改密码移动到WebUI栏目中 */}
        {
        /*
        <Tab title='修改密码' key='token'>
          <ConfigPageItem size='sm'>
            <ChangePasswordCard />
          </ConfigPageItem>
        </Tab>
        */
        }

        <Tab title='主题配置' key='theme'>
          <ConfigPageItem size='lg'>
            <ThemeConfigCard />
          </ConfigPageItem>
        </Tab>
        <Tab title='备份与恢复' key='backup'>
          <ConfigPageItem>
            <BackupConfigCard />
          </ConfigPageItem>
        </Tab>
        <Tab title='核心配置' key='core'>
          <ConfigPageItem>
            <CoreConfigCard />
          </ConfigPageItem>
        </Tab>
        <Tab title='反检测' key='bypass'>
          <ConfigPageItem>
            <BypassConfigCard />
          </ConfigPageItem>
        </Tab>
      </Tabs>
    </section>
  );
}
