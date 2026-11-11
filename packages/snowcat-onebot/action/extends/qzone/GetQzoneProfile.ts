import { OneBotAction } from '@/snowcat-onebot/action/OneBotAction';
import { ActionName } from '@/snowcat-onebot/action/router';
import { Static, Type } from '@sinclair/typebox';

const PayloadSchema = Type.Object({
  target_uin: Type.Optional(Type.String({ description: '目标QQ号，省略=机器人自己' })),
});

type PayloadType = Static<typeof PayloadSchema>;

export class GetQzoneProfile extends OneBotAction<PayloadType, unknown> {
  override actionName = ActionName.GetQzoneProfile;
  override actionSummary = '获取空间名称和说明';
  override actionDescription = '获取QQ空间名称和说明（默认当前账号，可查有权限的他人空间）';
  override actionTags = ['扩展接口'];
  override payloadExample = { target_uin: '123456789' };
  override returnExample = { name: '我的空间', description: '记录日常' };
  override payloadSchema = PayloadSchema;
  override returnSchema = Type.Object({
    name: Type.String(),
    description: Type.String(),
  });

  async _handle (payload: PayloadType) {
    return this.core.apis.WebApi.getQzoneProfile(payload.target_uin);
  }
}
