import { Button } from '@heroui/button';
import { Spinner } from '@heroui/spinner';
import { QRCodeSVG } from 'qrcode.react';
import { IoAlertCircle, IoRefresh } from 'react-icons/io5';

interface QrCodeLoginProps {
  qrcode: string;
  loginError?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  loginPhase?: string;
  isRecoveringLoginService?: boolean;
}

const QrCodeLogin: React.FC<QrCodeLoginProps> = ({ qrcode, loginError, onRefresh, isRefreshing = false, loginPhase, isRecoveringLoginService = false }) => {
  const transitionMessage = loginPhase === 'qrcode_scanned'
    ? '二维码已扫描，等待手机确认…'
    : loginPhase === 'initializing'
      ? 'QQ 登录成功，正在启动 SnowCat…'
      : loginPhase === 'reconnecting' || isRecoveringLoginService
        ? '正在重新连接 QQ 登录服务…'
        : undefined;
  return (
    <div className='flex flex-col items-center'>
      {(isRefreshing || transitionMessage) && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md'>
          <div className='flex flex-col items-center gap-3 rounded-3xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl border border-white/70 dark:border-white/10 px-10 py-8 shadow-2xl shadow-primary-900/20'>
            <Spinner color='primary' size='lg' />
            <div className='text-base font-semibold'>{transitionMessage || '正在刷新二维码…'}</div>
            <div className='text-xs text-default-500'>
              {transitionMessage ? '请不要关闭此页面，最长可能需要 3 分钟' : '正在等待新的二维码，最长 10 秒'}
            </div>
          </div>
        </div>
      )}
      {loginError && !qrcode && !isRecoveringLoginService
        ? (
          <div className='flex flex-col items-center py-4'>
            <div className='w-full flex justify-center mb-6'>
              <div className='p-4 bg-danger-50 dark:bg-danger-900/20 rounded-2xl'>
                <IoAlertCircle className='text-danger' size={56} />
              </div>
            </div>
            <div className='text-center space-y-2 px-4'>
              <div className='text-xl font-bold text-danger'>登录失败</div>
              <div className='text-default-600 text-sm leading-relaxed max-w-[300px]'>
                {loginError}
              </div>
            </div>
            {onRefresh && (
              <Button
                className='mt-8 min-w-[160px]'
                variant='solid'
                color='primary'
                size='lg'
                startContent={<IoRefresh />}
                onPress={onRefresh}
                isLoading={isRefreshing}
                isDisabled={isRefreshing}
              >
                重新获取二维码
              </Button>
            )}
          </div>
        )
        : (
          <>
            {loginError && (
              <div className='mb-4 w-full max-w-[360px] rounded-lg bg-warning-50 px-4 py-3 text-center text-sm text-warning-700 dark:bg-warning-50/20 dark:text-warning-300'>
                {loginError}
              </div>
            )}
            <div className='relative mx-auto w-fit rounded-2xl bg-white p-3 shadow-lg shadow-primary-900/10 ring-1 ring-black/5 overflow-hidden'>
              {!qrcode && (
                <div className='absolute inset-0 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm flex items-center justify-center z-10'>
                  <Spinner color='primary' />
                </div>
              )}
              <QRCodeSVG key={qrcode} size={176} value={qrcode || ' '} />
            </div>
            <div className='mt-5 text-center text-default-500 text-xs'>请使用 QQ 或 TIM 扫描上方二维码</div>
            {onRefresh && qrcode && (
              <Button
                className='mt-4'
                variant='flat'
                color='primary'
                size='sm'
                startContent={<IoRefresh />}
                onPress={onRefresh}
                isLoading={isRefreshing}
                isDisabled={isRefreshing}
              >
                刷新二维码
              </Button>
            )}
          </>
        )}
    </div>
  );
};

export default QrCodeLogin;
