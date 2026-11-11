import { OneBotAction } from '@/snowcat-onebot/action/OneBotAction';
import { ActionName } from '@/snowcat-onebot/action/router';
import { Static, Type } from '@sinclair/typebox';

const PayloadSchema = Type.Object({
  target_uin: Type.String({ description: '说说主人的QQ号' }),
  tid: Type.String({ description: '说说tid' }),
  like: Type.Boolean({ default: true, description: 'true=点赞 false=取消赞' }),
  abstime: Type.Optional(Type.Union([Type.Number(), Type.String()], { default: 0, description: '目标帖发帖时间(unix秒)，传真实值更稳' })),
});

type PayloadType = Static<typeof PayloadSchema>;

export class SetQzoneLike extends OneBotAction<PayloadType, null> {
  override actionName = ActionName.SetQzoneLike;
  override actionSummary = '说说点赞/取消赞';
  override actionDescription = '对一条说说点赞或取消赞（appid 311 mood）';
  override actionTags = ['扩展接口'];
  override payloadExample = { target_uin: '123456789', tid: 'abc123', like: true };
  override returnExample = null;
  override payloadSchema = PayloadSchema;
  override returnSchema = Type.Null();

  async _handle (payload: PayloadType): Promise<null> {
    await this.core.apis.WebApi.setQzoneLike(
      payload.target_uin,
      payload.tid,
      payload.like,
      payload.abstime !== undefined ? +payload.abstime : 0,
    );
    return null;
  }
}
