import { OneBotAction } from '@/snowcat-onebot/action/OneBotAction';
import { ActionName } from '@/snowcat-onebot/action/router';
import { Static, Type } from '@sinclair/typebox';

const PayloadSchema = Type.Object({
  name: Type.Optional(Type.String({ description: '空间名称，省略=不动' })),
  description: Type.Optional(Type.String({ description: '空间说明，省略=不动；空串=清空' })),
});

type PayloadType = Static<typeof PayloadSchema>;

export class SetQzoneProfile extends OneBotAction<PayloadType, null> {
  override actionName = ActionName.SetQzoneProfile;
  override actionSummary = '修改空间名称和说明';
  override actionDescription = '修改当前账号的空间名称/说明，只动传了的字段，空串=清空';
  override actionTags = ['扩展接口'];
  override payloadExample = { name: '我的空间', description: '记录日常' };
  override returnExample = null;
  override payloadSchema = PayloadSchema;
  override returnSchema = Type.Null();

  async _handle (payload: PayloadType): Promise<null> {
    await this.core.apis.WebApi.setQzoneProfile({
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
    });
    return null;
  }
}
