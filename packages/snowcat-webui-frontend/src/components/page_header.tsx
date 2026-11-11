import clsx from 'clsx';

export interface PageHeaderProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  /** 右侧操作区 */
  actions?: React.ReactNode;
  /** 图标底座配色 */
  accent?: 'primary' | 'secondary';
  className?: string;
}

/**
 * 统一页面头：图标底座 + 标题 + 描述 + 右侧操作。
 * 所有 dashboard 页面共用，保证标题层级与留白一致。
 */
const PageHeader: React.FC<PageHeaderProps> = ({
  icon,
  title,
  description,
  actions,
  accent = 'primary',
  className,
}) => {
  return (
    <div
      className={clsx(
        'sc-panel px-3 py-3 md:px-4 md:py-3.5 flex items-center gap-3 mb-4 md:mb-5',
        className
      )}
    >
      <div
        className={clsx(
          'w-10 h-10 flex-shrink-0 text-lg',
          accent === 'primary' ? 'sc-accent-tile' : 'sc-accent-tile-blue'
        )}
      >
        {icon}
      </div>
      <div className='min-w-0 flex-1'>
        <h1 className='sc-title truncate'>{title}</h1>
        {description && (
          <p className='sc-subtitle truncate mt-0.5'>{description}</p>
        )}
      </div>
      {actions && (
        <div className='flex items-center gap-2 flex-shrink-0'>{actions}</div>
      )}
    </div>
  );
};

export default PageHeader;
