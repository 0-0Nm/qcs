import { OneBotAction } from '@/snowcat-onebot/action/OneBotAction';
import { ActionName } from '@/snowcat-onebot/action/router';
import { Static, Type } from '@sinclair/typebox';

// SnowCat · qzone Web 线动作组（SnowLuma 移植）
// 全部走 core.apis.WebApi 的 cookie 管道（getQzoneAuth），无需本文件再做凭证处理。

const PayloadSchema = Type.Object({
  target_uin: Type.Optional(Type.String({ description: '目标QQ号，省略=机器人自己' })),
  pos: Type.Optional(Type.Union([Type.Number(), Type.String()], { default: 0, description: '起始偏移' })),
  num: Type.Optional(Type.Union([Type.Number(), Type.String()], { default: 20, description: '每页数量' })),
});

type PayloadType = Static<typeof PayloadSchema>;

export class GetQzoneMsgList extends OneBotAction<PayloadType, unknown> {
  override actionName = ActionName.GetQzoneMsgList;
  override actionSummary = '获取说说列表';
  override actionDescription = '获取QQ空间说说列表（默认自己空间，可查有权限的他人空间）；-10000限频自动切备路';
  override actionTags = ['扩展接口'];
  override payloadExample = { target_uin: '123456789', pos: 0, num: 20 };
  override returnExample = {
    total: 100,
    msglist: [{
      tid: 'abc123',
      content: '今天天气不错',
      time: 1760000000,
      comment_num: 2,
      is_private: false,
      images: ['https://...'],
    }],
  };
  override payloadSchema = PayloadSchema;
  override returnSchema = Type.Object({
    total: Type.Number(),
    msglist: Type.Array(Type.Object({
      tid: Type.String(),
      content: Type.String(),
      time: Type.Number(),
      comment_num: Type.Number(),
      is_private: Type.Boolean(),
      images: Type.Array(Type.String()),
    })),
  });

  async _handle (payload: PayloadType) {
    return this.core.apis.WebApi.getQzoneMsgList(
      payload.target_uin,
      payload.pos !== undefined ? +payload.pos : 0,
      payload.num !== undefined ? +payload.num : 20,
    );
  }
}
