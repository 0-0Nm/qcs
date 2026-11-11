import { OneBotAction } from '@/snowcat-onebot/action/OneBotAction';
import { ActionName } from '@/snowcat-onebot/action/router';
import { Static, Type } from '@sinclair/typebox';

// SnowCat 富返回版发说说：与官方风格 send_qzone_msg 并存，多返回 time。

const ValidRights = [1, 4, 16, 64, 128] as const;

const PayloadSchema = Type.Object({
  content: Type.String({ description: '说说正文' }),
  richvals: Type.Optional(Type.Array(Type.String(), { description: 'richval 数组（来自 uploadImageToQzone 或 get_qzone_msg_list 的图片机制），多图 \t 自动拼接' })),
  ugc_right: Type.Optional(Type.Union([Type.Number(), Type.String()], { default: 1, description: '查看权限: 1所有人 4好友 16部分好友 64仅自己 128部分好友不可见' })),
  target_uins: Type.Optional(Type.Array(Type.String(), { description: 'ugc_right为16/128时权限作用的QQ号数组' })),
});

type PayloadType = Static<typeof PayloadSchema>;

export class SendQzoneMsgFull extends OneBotAction<PayloadType, unknown> {
  override actionName = ActionName.SendQzoneMsgFull;
  override actionSummary = '发表说说（富返回）';
  override actionDescription = '发表QQ空间说说，返回 tid + 发布时间（send_qzone_msg 的富参版）';
  override actionTags = ['扩展接口'];
  override payloadExample = { content: '今天天气不错' };
  override returnExample = { tid: 'abc123', time: 1760000000 };
  override payloadSchema = PayloadSchema;
  override returnSchema = Type.Object({
    tid: Type.String(),
    time: Type.Number(),
  });

  async _handle (payload: PayloadType) {
    const ugcRight = payload.ugc_right !== undefined ? +payload.ugc_right : 1;
    if (!ValidRights.includes(ugcRight as typeof ValidRights[number])) {
      throw new Error(`ugc_right 参数不合法, 允许的值为: ${ValidRights.join(', ')}`);
    }
    if ((ugcRight === 16 || ugcRight === 128) && (!payload.target_uins || payload.target_uins.length === 0)) {
      throw new Error('ugc_right 为 16 或 128 时, target_uins 不能为空');
    }
    return this.core.apis.WebApi.publishQzoneMsgFull(
      payload.content,
      payload.richvals ?? [],
      ugcRight,
      payload.target_uins,
    );
  }
}
