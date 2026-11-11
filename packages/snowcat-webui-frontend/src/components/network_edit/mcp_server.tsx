import GenericForm, { random_token } from './generic_form';
import type { Field } from './generic_form';

export interface McpServerFormProps {
  data?: OneBotConfig['network']['mcpServers'][0];
  onClose: () => void;
  onSubmit: (
    data: OneBotConfig['network']['mcpServers'][0]
  ) => Promise<void>;
}

type McpServerFormType = OneBotConfig['network']['mcpServers'];

const McpServerForm: React.FC<McpServerFormProps> = ({
  data,
  onClose,
  onSubmit,
}) => {
  const defaultValues: McpServerFormType[0] = {
    enable: false,
    name: '',
    host: '127.0.0.1',
    port: 3002,
    token: random_token(16),
    debug: false,
  };

  const fields: Field<'mcpServers'>[] = [
    {
      name: 'enable',
      label: '启用',
      type: 'switch',
      description: '保存后启用此配置',
      colSpan: 1,
    },
    {
      name: 'debug',
      label: '开启Debug',
      type: 'switch',
      description: '是否开启调试模式',
      colSpan: 1,
    },
    {
      name: 'name',
      label: '名称',
      type: 'input',
      placeholder: '请输入名称',
      isRequired: true,
      isDisabled: !!data,
    },
    {
      name: 'host',
      label: 'Host',
      type: 'input',
      placeholder: '请输入主机地址',
      isRequired: true,
    },
    {
      name: 'port',
      label: 'Port',
      type: 'input',
      placeholder: '请输入端口',
      isRequired: true,
    },
    {
      name: 'token',
      label: 'Token',
      type: 'input',
      placeholder: '留空则不鉴权（仅限本机使用）',
      description: 'AI 宿主以 Authorization: Bearer <token> 连接',
    },
  ];

  return (
    <GenericForm
      data={data}
      defaultValues={defaultValues}
      onClose={onClose}
      onSubmit={onSubmit}
      fields={fields}
    />
  );
};

export default McpServerForm;
