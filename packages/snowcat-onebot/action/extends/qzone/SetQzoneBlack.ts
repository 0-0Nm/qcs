import { OneBotAction } from '@/snowcat-onebot/action/OneBotAction';
import { ActionName } from '@/snowcat-onebot/action/router';
import { Static, Type } from '@sinclair/typebox';

const PayloadSchema = Type.Object({
  target_uin: Type.String({ description: '目标QQ号' }),
  ban: Type.Boolean({ default: true, description: 'true=拉黑 false=解拉黑' }),
});

type PayloadType = Static<typeof PayloadSchema>;

export class SetQzoneBlack extends OneBotAction<PayloadType, null> {
  override actionName = ActionName.SetQzoneBlack;
  override actionSummary = '空间拉黑/解拉黑';
  override actionDescription = '把一个用户加入/移出机器人QQ空间的黑名单';
  override actionTags = ['扩展接口'];
  override payloadExample = { target_uin: '123456789', ban: true };
  override returnExample = null;
  override payloadSchema = PayloadSchema;
  override returnSchema = Type.Null();

  async _handle (payload: PayloadType): Promise<null> {
    await this.core.apis.WebApi.setQzoneBlack(payload.target_uin, payload.ban);
    return null;
  }
}
