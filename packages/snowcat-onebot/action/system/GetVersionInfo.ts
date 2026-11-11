import { OneBotAction } from '@/snowcat-onebot/action/OneBotAction';
import { ActionName } from '@/snowcat-onebot/action/router';
import { snowCatVersion } from 'snowcat-common/src/version';
import { Type, Static } from '@sinclair/typebox';

const ReturnSchema = Type.Object({
  app_name: Type.String({ description: '应用名称' }),
  protocol_version: Type.String({ description: '协议版本' }),
  app_version: Type.String({ description: '应用版本' }),
}, { description: '版本信息' });

type ReturnType = Static<typeof ReturnSchema>;

export default class GetVersionInfo extends OneBotAction<void, ReturnType> {
  override actionName = ActionName.GetVersionInfo;
  override returnSchema = ReturnSchema;
  override actionSummary = '获取版本信息';
  override actionDescription = '获取版本信息';
  override actionTags = ['系统接口'];
  override payloadExample = {};
  override returnExample = {
    app_name: 'SnowCat.Onebot',
    protocol_version: 'v11',
    app_version: '1.0.0',
  };

  async _handle (): Promise<ReturnType> {
    return {
      app_name: 'SnowCat.Onebot',
      protocol_version: 'v11',
      app_version: snowCatVersion,
    };
  }
}
