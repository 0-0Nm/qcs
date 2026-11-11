import { OneBotAction } from '@/snowcat-onebot/action/OneBotAction';
import { ActionName } from '@/snowcat-onebot/action/router';
import { Static, Type } from '@sinclair/typebox';

const ValidRights = [1, 4, 16, 64, 128] as const;

const PayloadSchema = Type.Object({
  tid: Type.String({ description: '说说tid（自己的说说）' }),
  ugc_right: Type.Union([Type.Number(), Type.String()], { description: '查看权限: 1所有人 4好友 16部分好友 64仅自己 128部分好友不可见' }),
  target_uins: Type.Optional(Type.Array(Type.String(), { description: 'ugc_right为16/128时权限作用的QQ号数组' })),
});

type PayloadType = Static<typeof PayloadSchema>;

export class SetQzoneMsgRight extends OneBotAction<PayloadType, unknown> {
  override actionName = ActionName.SetQzoneMsgRight;
  override actionSummary = '修改说说查看权限';
  override actionDescription = '改一条已有说说的查看权限（内部走 msgdetail→update 两步全量重提）';
  override actionTags = ['扩展接口'];
  override payloadExample = { tid: 'abc123', ugc_right: 4 };
  override returnExample = { ugc_right: 4 };
  override payloadSchema = PayloadSchema;
  override returnSchema = Type.Object({ ugc_right: Type.Number() });

  async _handle (payload: PayloadType) {
    const right = +payload.ugc_right;
    if (!ValidRights.includes(right as typeof ValidRights[number])) {
      throw new Error(`ugc_right 参数不合法, 允许的值为: ${ValidRights.join(', ')}`);
    }
    if ((right === 16 || right === 128) && (!payload.target_uins || payload.target_uins.length === 0)) {
      throw new Error('ugc_right 为 16 或 128 时, target_uins 不能为空');
    }
    return this.core.apis.WebApi.setQzoneMsgRight(payload.tid, right, payload.target_uins);
  }
}
