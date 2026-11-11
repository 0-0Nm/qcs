import { ContextMode, ReturnDataType, SendMsgBase, SendMsgPayload } from '@/snowcat-onebot/action/msg/SendMsg';
import { ActionName, BaseCheckResult } from '@/snowcat-onebot/action/router';

import { GroupActionsExamples } from '../example/GroupActionsExamples';
import { snowCatStable } from '@/snowcat-onebot/stable-line';

// 未检测参数
class SendGroupMsg extends SendMsgBase {
  override actionName = ActionName.SendGroupMsg;
  override actionSummary = '发送群消息';
  override actionDescription = '发送群消息';
  override actionTags = ['群组接口'];
  override payloadExample = GroupActionsExamples.SendGroupMsg.payload;
  override returnExample = GroupActionsExamples.SendGroupMsg.response;

  protected override async check (payload: SendMsgPayload): Promise<BaseCheckResult> {
    delete payload.user_id;
    payload.message_type = 'group';
    return super.check(payload);
  }

  override async _handle (payload: SendMsgPayload): Promise<ReturnDataType> {
    // SnowCat 稳定线：真人抖动+账号预算+熔断
    await snowCatStable.stableDelay();
    return this.base_handle(payload, ContextMode.Group);
  }
}

export default SendGroupMsg;
