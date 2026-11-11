import { OB11User } from '@/snowcat-onebot/index';
import { OB11Construct } from '@/snowcat-onebot/helper/data';
import { OneBotAction } from '@/snowcat-onebot/action/OneBotAction';
import { ActionName } from '@/snowcat-onebot/action/router';
import { OB11UserSchema } from '../schemas';
import { Type } from '@sinclair/typebox';
import { SystemActionsExamples } from '@/snowcat-onebot/action/example/SystemActionsExamples';

class GetLoginInfo extends OneBotAction<void, OB11User> {
  override actionName = ActionName.GetLoginInfo;
  override payloadSchema = Type.Object({});
  override returnSchema = OB11UserSchema;
  override actionSummary = '获取登录号信息';
  override actionDescription = '获取当前登录帐号的信息';
  override actionTags = ['系统接口'];
  override payloadExample = SystemActionsExamples.GetLoginInfo.payload;
  override returnExample = SystemActionsExamples.GetLoginInfo.response;

  async _handle () {
    return OB11Construct.selfInfo(this.core.selfInfo);
  }
}

export default GetLoginInfo;
