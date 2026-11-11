import { Card, CardBody, CardHeader } from '@heroui/card';
import { Chip } from '@heroui/chip';
import { Divider } from '@heroui/divider';
import { Image } from '@heroui/image';
import { Link } from '@heroui/link';
import { Spinner } from '@heroui/spinner';
import { Tab, Tabs } from '@heroui/tabs';
import { useRequest } from 'ahooks';
import {
  BsCodeSlash,
  BsCpu,
  BsGithub,
  BsGlobe,
  BsPlugin,
  BsTerminal,
} from 'react-icons/bs';
import { IoDocument, IoHeartCircleOutline, IoRocketSharp } from 'react-icons/io5';
import { LuPlugZap, LuServer } from 'react-icons/lu';

import logo from '@/assets/images/logo.png';
import WebUIManager from '@/controllers/webui_manager';

function VersionInfo () {
  const { data, loading, error } = useRequest(WebUIManager.GetSnowCatVersion);

  return (
    <div className='flex items-center gap-2'>
      {error
        ? (
          <Chip color='danger' variant='flat' size='sm'>{error.message}</Chip>
        )
        : loading
          ? (
            <Spinner size='sm' color='default' />
          )
          : (
            <div className='flex items-center gap-2'>
              <Chip size='sm' color='default' variant='flat' className='text-default-500'>WebUI Next</Chip>
              <Chip size='sm' color='primary' variant='flat'>Core {data?.version}</Chip>
            </div>
          )}
    </div>
  );
}

export default function AboutPage () {
  const features = [
    {
      icon: <LuPlugZap size={20} />,
      title: '接入方式全',
      desc: 'WS 正反连、HTTP 上报、HTTP SSE、MCP 四种接入方式，按需取用。',
      className: 'bg-primary-50 text-primary',
    },
    {
      icon: <LuServer size={20} />,
      title: '社区自持主干',
      desc: '上游 Ending 后由社区接力维护，Fork 是遗愿，我们续写。',
      className: 'bg-success-50 text-success',
    },
    {
      icon: <BsCodeSlash size={20} />,
      title: 'OneBot 11 全量',
      desc: '181 上游动作 + SnowLuma 采石场 29+ 动作，持续扩充。',
      className: 'bg-warning-50 text-warning',
    },
    {
      icon: <IoRocketSharp size={20} />,
      title: '稳定线内建',
      desc: '掉线指数退避重连、真人节奏抖动、小时预算、连发熔断。',
      className: 'bg-secondary-50 text-secondary',
    },
    {
      icon: <BsGlobe size={20} />,
      title: '全平台零硬改',
      desc: '自动发现已装 QQ、自动读实况版本、一键注入；亦有便携制作器。',
      className: 'bg-default-50 text-default-600',
    },
    {
      icon: <BsCpu size={20} />,
      title: '本地运行时',
      desc: '一切动作都在本地执行，代码全开源白盒可查，无任何外发。',
      className: 'bg-danger-50 text-danger',
    },
  ];

  const links = [
    { icon: <BsGithub />, name: 'GitHub · DandanLLab/SnowCatQQ', href: 'https://github.com/DandanLLab/SnowCatQQ' },
    { icon: <IoDocument />, name: '文档 · README 与接入指南', href: 'https://github.com/DandanLLab/SnowCatQQ#readme' },
    { icon: <BsTerminal />, name: 'API 文档 · OneBot v11 动作全表', href: 'https://github.com/DandanLLab/SnowCatQQ/tree/main/docs/api' },
    { icon: <BsPlugin />, name: 'MCP 接入 · Network 配置 mcpServers', href: 'https://github.com/DandanLLab/SnowCatQQ#mcp' },
  ];

  const upstreams = [
    { name: 'NapCat（NapNeko/NapCatQQ）', role: '底座 · 上游已官宣 Ending，Fork 接力' },
    { name: 'SnowLuma（继任 TomyJan/SnowLuma）', role: '能力采石场 · qzone 全家桶/群相册/闪照等' },
  ];

  const cardStyle = 'bg-white/55 dark:bg-white/[0.04] backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-sm rounded-2xl';

  return (
    <div className='sc-page flex flex-col gap-5'>
      <title>关于 - SnowCat WebUI · 雪猫控制台</title>

      {/* 头部：品牌横幅 */}
      <div
        className='rounded-2xl px-5 py-6 bg-gradient-to-r from-primary-100/70 via-primary-50/40 to-transparent dark:from-primary-900/30 dark:via-primary-900/10 dark:to-transparent border border-primary-100/60 dark:border-primary-900/30 relative overflow-hidden'
      >
        <div className='absolute -right-10 -top-10 w-40 h-40 rounded-full bg-primary-300/30 blur-3xl pointer-events-none' />
        <div className='flex items-center gap-4 flex-wrap relative'>
          <Image src={logo} alt='SnowCat Logo（雪猫）' width={44} height={44} className='rounded-xl' />
          <div>
            <h1 className='text-2xl font-bold text-default-900 dark:text-white tracking-tight'>
              SnowCat · 雪猫
            </h1>
            <p className='text-small text-default-500 mt-0.5'>
              社区自持的 QQ 融合客户端 · 本地运行时 · 白盒可查
            </p>
          </div>
          <div className='ml-auto flex items-center gap-3'>
            <VersionInfo />
          </div>
        </div>
      </div>

      <Divider className='opacity-50' />

      {/* 主内容：双栏 */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-5 flex-grow'>

        {/* 左栏：特性 + 接入方式 */}
        <div className='lg:col-span-2 space-y-5'>
          <Card shadow='sm' className={cardStyle}>
            <CardHeader className='pb-0 pt-4 px-4 flex-col items-start'>
              <h2 className='text-lg font-bold'>为什么有雪猫</h2>
            </CardHeader>
            <CardBody className='py-4 text-default-600 leading-relaxed space-y-2'>
              <p>
                2026-11 上游 NapCat 官宣 Ending，SnowLuma 原库消失。Fork 是遗愿，
                接力棒掉在地上我们捡——雪猫由此而生。
              </p>
              <p>
                我们不与官方对着干：官方走工作流，雪猫走个人开发者的娱乐与陪伴路线，
                两赛道互不干涉，社区共享。运行时全部在本地，所有动作本地执行、代码白盒可查。
              </p>
            </CardBody>
          </Card>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {features.map((item, index) => (
              <Card key={index} shadow='sm' className={cardStyle}>
                <CardBody className='flex flex-row items-start gap-4 p-4'>
                  <div className={`p-3 rounded-lg ${item.className}`}>
                    {item.icon}
                  </div>
                  <div>
                    <h3 className='font-semibold text-default-900'>{item.title}</h3>
                    <p className='text-small text-default-500 mt-1'>{item.desc}</p>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>

          {/* 接入方式 */}
          <Card shadow='sm' className={cardStyle}>
            <CardHeader className='pb-0 pt-4 px-4'>
              <h2 className='text-lg font-bold'>接入方式</h2>
            </CardHeader>
            <CardBody className='py-4'>
              <Tabs
                aria-label='接入方式'
                size='sm'
                classNames={{ tabList: 'bg-default-100/50' }}
              >
                <Tab key='ws' title='WebSocket'>
                  <div className='text-small text-default-600 space-y-2 pt-2'>
                    <p>正向 WS：雪猫开服务端口，客户端连进来（网络配置 → WS服务器）。</p>
                    <p>反向 WS：雪猫作为客户端主动连你的服务（网络配置 → WS客户端，dsh 生态即此模式）。</p>
                    <p className='text-tiny text-default-400'>协议：OneBot v11，事件上报 + 动作调用双通道。</p>
                  </div>
                </Tab>
                <Tab key='http' title='HTTP'>
                  <div className='text-small text-default-600 space-y-2 pt-2'>
                    <p>HTTP 服务器：本地开端口收动作调用（网络配置 → HTTP服务器）。</p>
                    <p>HTTP 客户端：事件主动 POST 上报到你的回调地址。</p>
                    <p>HTTP SSE：服务器推送事件流，适合浏览器内直连。</p>
                  </div>
                </Tab>
                <Tab key='mcp' title='MCP'>
                  <div className='text-small text-default-600 space-y-2 pt-2'>
                    <p>Model Context Protocol：把雪猫的全部动作以 MCP 工具形式暴露。</p>
                    <p>在网络配置 → MCP 服务器中添加条目，AI 宿主（Claude / dsh 等）即可直连调用。</p>
                    <p className='text-tiny text-default-400'>传输：Streamable HTTP，兼容 MCP 2025-03-26 规范。</p>
                  </div>
                </Tab>
              </Tabs>
            </CardBody>
          </Card>
        </div>

        {/* 右栏：链接 + 入群 + 上游致谢 */}
        <div className='space-y-5'>
          <Card shadow='sm' className={cardStyle}>
            <CardHeader className='pb-0 pt-4 px-4'>
              <h2 className='text-lg font-bold'>开源与文档</h2>
            </CardHeader>
            <CardBody className='py-4 space-y-2'>
              <div className='flex flex-col gap-1'>
                {links.map((link, idx) => (
                  <Link
                    key={idx}
                    isExternal
                    href={link.href}
                    className='flex items-center justify-between p-2.5 rounded-xl hover:bg-default-100/50 transition-colors text-default-600 text-small'
                  >
                    <span className='flex items-center gap-3 min-w-0'>
                      {link.icon}
                      <span className='truncate'>{link.name}</span>
                    </span>
                    <span className='text-tiny text-default-400 flex-shrink-0'>→</span>
                  </Link>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card shadow='sm' className={cardStyle}>
            <CardHeader className='pb-0 pt-4 px-4'>
              <h2 className='text-lg font-bold flex items-center gap-2'>
                <IoHeartCircleOutline className='text-danger' /> 上游致谢
              </h2>
            </CardHeader>
            <CardBody className='py-4 space-y-3'>
              {upstreams.map((u) => (
                <div key={u.name}>
                  <p className='text-small font-medium text-default-700'>{u.name}</p>
                  <p className='text-tiny text-default-400 mt-0.5'>{u.role}</p>
                </div>
              ))}
              <Divider className='opacity-40' />
              <p className='text-tiny text-default-400'>
                MIT License © {new Date().getFullYear()} SnowCat Team · Made with ❤️ by the community
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
