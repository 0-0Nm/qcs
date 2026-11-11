import { Button } from '@heroui/button';
import toast from 'react-hot-toast';
import { LuDownload, LuUpload } from 'react-icons/lu';
import { requestServerWithFetch } from '@/utils/request';

// 导入配置
const handleImportConfig = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  // 检查文件类型
  if (!file.name.endsWith('.zip')) {
    toast.error('请选择zip格式的配置文件');
    return;
  }

  try {
    const formData = new FormData();
    formData.append('configFile', file);

    const response = await requestServerWithFetch('/OB11Config/ImportConfig', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '导入配置失败');
    }

    const result = await response.json();
    // 检查是否成功导入
    if (result.code === 0) {
      toast.success(result.data?.message || '配置导入成功。');
    } else {
      toast.error(`配置导入失败: ${result.data?.message || '未知错误'}`);
    }
  } catch (error) {
    const msg = (error as Error).message;
    toast.error(`导入配置失败: ${msg}`);
  } finally {
    // 重置文件输入
    event.target.value = '';
  }
};

// 导出配置
const handleExportConfig = async () => {
  try {
    const response = await requestServerWithFetch('/OB11Config/ExportConfig', {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('导出配置失败');
    }

    // 创建下载链接
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileName = response.headers.get('Content-Disposition')?.split('=')[1]?.replace(/"/g, '') || 'config_backup.zip';
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast.success('配置导出成功');
  } catch (error) {
    const msg = (error as Error).message;

    toast.error(`导出配置失败: ${msg}`);
  }
};

const BackupConfigCard: React.FC = () => {
  return (
    <div className='space-y-5'>
      <div>
        <h3 className='text-lg font-semibold text-default-800 dark:text-white mb-1.5'>备份与恢复</h3>
        <p className='text-sm text-default-500 mb-5 leading-relaxed'>
          导出当前全部配置为 zip 备份，或从备份文件恢复。适合换机迁移与升级前留档。
        </p>

        <div className='flex flex-wrap gap-3'>
          <Button
            className='bg-gradient-to-r from-primary-400 to-primary-600 text-white font-semibold shadow-md shadow-primary-500/25'
            radius='full'
            startContent={<LuDownload size={17} />}
            onPress={handleExportConfig}
          >
            导出配置
          </Button>
          <label className='cursor-pointer'>
            <input
              type='file'
              accept='.zip'
              onChange={handleImportConfig}
              className='hidden'
            />
            <Button
              className='bg-white/60 dark:bg-white/[0.06] text-default-700 dark:text-default-200 border border-white/60 dark:border-white/10 font-medium'
              radius='full'
              variant='flat'
              as='span'
              startContent={<LuUpload size={17} />}
            >
              导入配置
            </Button>
          </label>
        </div>

        <div className='mt-5 p-3.5 bg-warning-50/70 dark:bg-warning-900/20 border border-warning-200/60 dark:border-warning-800/40 rounded-2xl'>
          <p className='text-xs text-warning-700 dark:text-warning-400 leading-relaxed'>
            导入配置会覆盖当前所有设置，请谨慎操作。导入前建议先导出当前配置作为备份。
          </p>
        </div>
      </div>
    </div>
  );
};

export default BackupConfigCard;
