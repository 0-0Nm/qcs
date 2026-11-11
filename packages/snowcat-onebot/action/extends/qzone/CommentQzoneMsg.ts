import { OneBotAction } from '@/snowcat-onebot/action/OneBotAction';
import { ActionName } from '@/snowcat-onebot/action/router';
import { Static, Type } from '@sinclair/typebox';

const PayloadSchema = Type.Object({
  host_uin: Type.String({ description: '说说主人的QQ号' }),
  tid: Type.String({ description: '说说tid' }),
  content: Type.String({ description: '评论正文' }),
  richval: Type.Optional(Type.String({ description: '图片评论时传图片直链（与发说说的richval串不同）' })),
});

type PayloadType = Static<typeof PayloadSchema>;

export class CommentQzoneMsg extends OneBotAction<PayloadType, unknown> {
  override actionName = ActionName.CommentQzoneMsg;
  override actionSummary = '评论说说';
  override actionDescription = '给一条说说发评论（emotion_cgi_re_feeds）';
  override actionTags = ['扩展接口'];
  override payloadExample = { host_uin: '123456789', tid: 'abc123', content: '说得好' };
  override returnExample = { comment_id: '999' };
  override payloadSchema = PayloadSchema;
  override returnSchema = Type.Object({ comment_id: Type.String() });

  async _handle (payload: PayloadType) {
    return this.core.apis.WebApi.commentQzoneMsg(
      payload.host_uin,
      payload.tid,
      payload.content,
      payload.richval,
    );
  }
}
