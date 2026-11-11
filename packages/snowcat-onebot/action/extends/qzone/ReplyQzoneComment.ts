import { OneBotAction } from '@/snowcat-onebot/action/OneBotAction';
import { ActionName } from '@/snowcat-onebot/action/router';
import { Static, Type } from '@sinclair/typebox';

const PayloadSchema = Type.Object({
  host_uin: Type.String({ description: '说说主人的QQ号' }),
  tid: Type.String({ description: '说说tid' }),
  content: Type.String({ description: '回复正文' }),
  comment_id: Type.String({ description: '父评论id（顶层评论，回复楼中楼也传顶层）' }),
  comment_uin: Type.String({ description: '父评论作者QQ号' }),
  reply_to_uin: Type.Optional(Type.String({ description: '楼中楼点名作者的QQ号' })),
  reply_to_name: Type.Optional(Type.String({ description: '楼中楼点名作者的昵称' })),
});

type PayloadType = Static<typeof PayloadSchema>;

export class ReplyQzoneComment extends OneBotAction<PayloadType, unknown> {
  override actionName = ActionName.ReplyQzoneComment;
  override actionSummary = '回复说说评论';
  override actionDescription = '在说说的评论线程里回复（独立端点；点名作者自动转@提及）';
  override actionTags = ['扩展接口'];
  override payloadExample = { host_uin: '123456789', tid: 'abc123', content: '同意', comment_id: '999', comment_uin: '987654321' };
  override returnExample = { comment_id: '1001' };
  override payloadSchema = PayloadSchema;
  override returnSchema = Type.Object({ comment_id: Type.String() });

  async _handle (payload: PayloadType) {
    const replyTo = payload.reply_to_uin && payload.reply_to_name
      ? { uin: payload.reply_to_uin, name: payload.reply_to_name }
      : undefined;
    return this.core.apis.WebApi.replyQzoneComment(
      payload.host_uin,
      payload.tid,
      payload.content,
      {
        commentId: payload.comment_id,
        commentUin: payload.comment_uin,
        ...(replyTo ? { replyTo } : {}),
      },
    );
  }
}
