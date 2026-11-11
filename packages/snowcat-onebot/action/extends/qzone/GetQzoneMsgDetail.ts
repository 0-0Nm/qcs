import { OneBotAction } from '@/snowcat-onebot/action/OneBotAction';
import { ActionName } from '@/snowcat-onebot/action/router';
import { Static, Type } from '@sinclair/typebox';

const PayloadSchema = Type.Object({
  target_uin: Type.String({ description: '说说主人的QQ号' }),
  tid: Type.String({ description: '说说tid' }),
  pos: Type.Optional(Type.Union([Type.Number(), Type.String()], { default: 0, description: '评论起始偏移' })),
  num: Type.Optional(Type.Union([Type.Number(), Type.String()], { default: 20, description: '评论每页数量' })),
});

type PayloadType = Static<typeof PayloadSchema>;

export class GetQzoneMsgDetail extends OneBotAction<PayloadType, unknown> {
  override actionName = ActionName.GetQzoneMsgDetail;
  override actionSummary = '获取说说详情';
  override actionDescription = '读取一条说说正文与一页评论（含内联回复）';
  override actionTags = ['扩展接口'];
  override payloadExample = { target_uin: '123456789', tid: 'abc123' };
  override returnExample = {
    tid: 'abc123',
    content: '正文',
    comment_num: 2,
    comments: [],
  };
  override payloadSchema = PayloadSchema;
  override returnSchema = Type.Object({
    tid: Type.String(),
    content: Type.String(),
    comment_num: Type.Number(),
    comments: Type.Array(Type.Any()),
  });

  async _handle (payload: PayloadType) {
    return this.core.apis.WebApi.getQzoneMsgDetail(
      payload.target_uin,
      payload.tid,
      payload.pos !== undefined ? +payload.pos : 0,
      payload.num !== undefined ? +payload.num : 20,
    );
  }
}
