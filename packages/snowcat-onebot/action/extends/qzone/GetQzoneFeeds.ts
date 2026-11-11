import { OneBotAction } from '@/snowcat-onebot/action/OneBotAction';
import { ActionName } from '@/snowcat-onebot/action/router';
import { Static, Type } from '@sinclair/typebox';

const PayloadSchema = Type.Object({
  page_num: Type.Optional(Type.Union([Type.Number(), Type.String()], { default: 1, description: '页码（无cursor时生效）' })),
  count: Type.Optional(Type.Union([Type.Number(), Type.String()], { default: 10, description: '每页条数(1-50)' })),
  cursor: Type.Optional(Type.String({ description: '上次返回的 next_cursor，续翻用' })),
});

type PayloadType = Static<typeof PayloadSchema>;

export class GetQzoneFeeds extends OneBotAction<PayloadType, unknown> {
  override actionName = ActionName.GetQzoneFeeds;
  override actionSummary = '获取空间好友动态流';
  override actionDescription = '读取QQ空间好友动态（HTML载荷数据级解析，不执行远程内容）；cursor 续翻';
  override actionTags = ['扩展接口'];
  override payloadExample = { page_num: 1, count: 10 };
  override returnExample = {
    feeds: [{ uin: 123456789, nickname: '张三', tid: 'abc', content: '动态正文', images: [], like_count: 5, comment_count: 2, appid: 311, key: 'k', time: 1760000000, html: '', content_complete: true }],
    has_more: true,
    next_cursor: 'eyJ...',
  };
  override payloadSchema = PayloadSchema;
  override returnSchema = Type.Object({
    feeds: Type.Array(Type.Any()),
    has_more: Type.Boolean(),
    next_cursor: Type.Union([Type.String(), Type.Null()]),
  });

  async _handle (payload: PayloadType) {
    return this.core.apis.WebApi.getQzoneFeeds(
      payload.page_num !== undefined ? +payload.page_num : 1,
      payload.count !== undefined ? +payload.count : 10,
      payload.cursor,
    );
  }
}
