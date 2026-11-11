import clsx from 'clsx';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** 紧凑模式：用于卡片内部的空区块 */
  compact?: boolean;
  className?: string;
}

/**
 * 统一空状态：图标底座 + 标题 + 说明 + 可选操作。
 * 用虚线容器包裹，避免大片留白显得"页面坏了"。
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  compact = false,
  className,
}) => {
  return (
    <div
      className={clsx(
        'w-full flex flex-col items-center justify-center text-center',
        'rounded-2xl border border-dashed border-default-200/80 dark:border-white/10',
        'bg-white/40 dark:bg-white/[0.02]',
        compact ? 'py-8 px-4 gap-1.5' : 'py-14 px-6 gap-2',
        className
      )}
    >
      <div
        className={clsx(
          'rounded-2xl flex items-center justify-center text-primary-500',
          'bg-gradient-to-br from-primary-100/80 to-secondary-100/60',
          'dark:from-primary-900/30 dark:to-secondary-900/20',
          compact ? 'w-11 h-11 text-lg mb-1' : 'w-14 h-14 text-2xl mb-2'
        )}
      >
        {icon}
      </div>
      <p
        className={clsx(
          'font-semibold text-default-700 dark:text-default-200',
          compact ? 'text-small' : 'text-base'
        )}
      >
        {title}
      </p>
      {description && (
        <p className='text-tiny text-default-400 max-w-sm leading-relaxed'>{description}</p>
      )}
      {action && <div className='mt-2'>{action}</div>}
    </div>
  );
};

export default EmptyState;
