import { Chip } from '@heroui/chip';

import NetworkDisplayCard from './common_card';
import type { NetworkDisplayCardFields } from './common_card';

interface McpServerDisplayCardProps {
  data: OneBotConfig['network']['mcpServers'][0];
  showType?: boolean;
  onEdit: () => void;
  onEnable: () => Promise<void>;
  onDelete: () => Promise<void>;
  onEnableDebug: () => Promise<void>;
}

const McpServerDisplayCard: React.FC<McpServerDisplayCardProps> = (
  props
) => {
  const { data, showType, onEdit, onEnable, onDelete, onEnableDebug } = props;
  const { host, port, token } = data;

  const fields: NetworkDisplayCardFields<'mcpServers'> = [
    { label: '主机', value: host },
    { label: '端口', value: port },
    { label: '端点', value: `/mcp` },
    {
      label: '鉴权',
      value: !!token,
      render: (value) => (
        <Chip color={value ? 'success' : 'warning'} size='sm' variant='flat'>
          {value ? 'Bearer Token' : '未鉴权'}
        </Chip>
      ),
    },
  ];

  return (
    <NetworkDisplayCard
      data={data}
      showType={showType}
      typeLabel='MCP服务器'
      fields={fields}
      onEdit={onEdit}
      onEnable={onEnable}
      onDelete={onDelete}
      onEnableDebug={onEnableDebug}
    />
  );
};

export default McpServerDisplayCard;
