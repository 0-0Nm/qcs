/**
 * SnowCat · QQ空间公共空间（空友推荐）13 动作
 *
 * 底层：snowcat-core/apis/qzone-public-web.ts（SnowLuma qzone-public.ts 移植）
 * 动作约定：feed/comment/reply 等复杂对象由调用方从 get_qzone_public_feeds /
 * get_qzone_public_feed_detail 的返回中原样回传（透明通道，不做二次建模）。
 */

import { OneBotAction } from '@/snowcat-onebot/action/OneBotAction';
import { ActionName } from '@/snowcat-onebot/action/router';
import { Static, Type } from '@sinclair/typebox';

const FeedObject = Type.Any({ description: '完整动态对象（来自 get_qzone_public_feeds/feed_detail，原样回传）' });
const CommentObject = Type.Any({ description: '评论对象（原样回传）' });
const ReplyObject = Type.Optional(Type.Any({ description: '回复对象（原样回传）' }));
const UserObject = Type.Any({ description: '用户身份对象（详情/列表响应里的 user 形态）' });

/** 公共动作共用的 WebApi 快捷取凭证。 */
function publicApi (action: OneBotAction<unknown, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (action as any).core.apis.WebApi;
}

// 1. get_qzone_public_capabilities —— 查询账号空友入口白名单
const CapPayload = Type.Object({});
export class GetQzonePublicCapabilities extends OneBotAction<Static<typeof CapPayload>, unknown> {
  override actionName = ActionName.GetQzonePublicCapabilities;
  override actionSummary = '查询空友入口能力';
  override actionDescription = '查询当前账号在 QQ 空间公共空间（空友）各入口的白名单能力';
  override actionTags = ['扩展接口'];
  override payloadExample = {};
  override returnExample = { entrance1: true, entrance15: false };
  override payloadSchema = CapPayload;
  override returnSchema = Type.Any();

  async _handle () {
    const api = publicApi(this);
    const { uin, g_tk, cookie } = await api.getQzoneAuth();
    return api.getQzonePublicCapabilities(cookie, g_tk, uin);
  }
}

// 2. get_qzone_public_feeds —— 空友推荐动态流
const FeedsPayload = Type.Object({
  cursor: Type.Optional(Type.String({ description: '上次返回的 next_cursor，续翻用' })),
});
export class GetQzonePublicFeeds extends OneBotAction<Static<typeof FeedsPayload>, unknown> {
  override actionName = ActionName.GetQzonePublicFeeds;
  override actionSummary = '获取空友推荐动态';
  override actionDescription = '读取QQ空间公共空间（空友）推荐动态流，cursor 续翻';
  override actionTags = ['扩展接口'];
  override payloadExample = {};
  override returnExample = { feeds: [], has_more: false, next_cursor: null };
  override payloadSchema = FeedsPayload;
  override returnSchema = Type.Any();

  async _handle (payload: Static<typeof FeedsPayload>) {
    const { uin, g_tk, cookie } = await publicApi(this).getQzoneAuth();
    return publicApi(this).getQzonePublicFeeds(cookie, g_tk, uin, payload.cursor);
  }
}

// 3. get_qzone_public_feed_detail —— 空友单条动态详情
const DetailPayload = Type.Object({ feed: FeedObject });
export class GetQzonePublicFeedDetail extends OneBotAction<Static<typeof DetailPayload>, unknown> {
  override actionName = ActionName.GetQzonePublicFeedDetail;
  override actionSummary = '获取空友动态详情';
  override actionDescription = '获取一条空友推荐动态的完整详情（含评论首屏）';
  override actionTags = ['扩展接口'];
  override payloadExample = { feed: {} };
  override returnExample = {};
  override payloadSchema = DetailPayload;
  override returnSchema = Type.Any();

  async _handle (payload: Static<typeof DetailPayload>) {
    const { g_tk, cookie } = await publicApi(this).getQzoneAuth();
    return publicApi(this).getQzonePublicFeedDetail(cookie, g_tk, payload.feed);
  }
}

// 4. get_qzone_public_comments —— 空友评论分页
const CommentsPayload = Type.Object({
  feed: FeedObject,
  cursor: Type.String({ description: '详情/上页返回的评论 attach_info' }),
});
export class GetQzonePublicComments extends OneBotAction<Static<typeof CommentsPayload>, unknown> {
  override actionName = ActionName.GetQzonePublicComments;
  override actionSummary = '获取空友评论分页';
  override actionDescription = '分页读取一条空友动态的评论';
  override actionTags = ['扩展接口'];
  override payloadExample = { feed: {}, cursor: '' };
  override returnExample = {};
  override payloadSchema = CommentsPayload;
  override returnSchema = Type.Any();

  async _handle (payload: Static<typeof CommentsPayload>) {
    const { g_tk, cookie } = await publicApi(this).getQzoneAuth();
    return publicApi(this).getQzonePublicComments(cookie, g_tk, payload.feed, payload.cursor);
  }
}

// 5. get_qzone_public_replies —— 空友楼中楼分页
const RepliesPayload = Type.Object({
  feed: FeedObject,
  comment: CommentObject,
  cursor: Type.Optional(Type.String({ description: '回复 attach_info，省略用 comment 自带' })),
  page_size: Type.Optional(Type.Union([Type.Number(), Type.String()], { default: 20, description: '每页条数' })),
});
export class GetQzonePublicReplies extends OneBotAction<Static<typeof RepliesPayload>, unknown> {
  override actionName = ActionName.GetQzonePublicReplies;
  override actionSummary = '获取空友楼中楼分页';
  override actionDescription = '分页读取一条空友评论的楼中楼回复';
  override actionTags = ['扩展接口'];
  override payloadExample = { feed: {}, comment: {}, cursor: '', page_size: 20 };
  override returnExample = {};
  override payloadSchema = RepliesPayload;
  override returnSchema = Type.Any();

  async _handle (payload: Static<typeof RepliesPayload>) {
    const { g_tk, cookie } = await publicApi(this).getQzoneAuth();
    return publicApi(this).getQzonePublicReplies(
      cookie, g_tk, payload.feed, payload.comment,
      payload.cursor ?? '', payload.page_size !== undefined ? +payload.page_size : 20,
    );
  }
}

// 6. set_qzone_public_upvote —— 空友动态点赞/取消（UFO Upvote）
const UpvotePayload = Type.Object({ feed: FeedObject, enable: Type.Boolean({ default: true }) });
export class SetQzonePublicUpvote extends OneBotAction<Static<typeof UpvotePayload>, unknown> {
  override actionName = ActionName.SetQzonePublicUpvote;
  override actionSummary = '空友动态点赞/取消';
  override actionDescription = '对一条空友推荐动态点赞或取消点赞（UFO Upvote/Downvote）';
  override actionTags = ['扩展接口'];
  override payloadExample = { feed: {}, enable: true };
  override returnExample = {};
  override payloadSchema = UpvotePayload;
  override returnSchema = Type.Any();

  async _handle (payload: Static<typeof UpvotePayload>) {
    const { g_tk, cookie } = await publicApi(this).getQzoneAuth();
    return publicApi(this).setQzonePublicUpvote(cookie, g_tk, payload.feed, payload.enable);
  }
}

// 7. set_qzone_public_like —— 空友动态点赞（DoLike 系）
const LikePayload = Type.Object({ feed: FeedObject, enable: Type.Boolean({ default: true }) });
export class SetQzonePublicLike extends OneBotAction<Static<typeof LikePayload>, unknown> {
  override actionName = ActionName.SetQzonePublicLike;
  override actionSummary = '空友动态点赞（DoLike）';
  override actionDescription = '对一条空友动态点赞/取消赞（DoLike/UnLike，key 取 cur_like_key）';
  override actionTags = ['扩展接口'];
  override payloadExample = { feed: {}, enable: true };
  override returnExample = {};
  override payloadSchema = LikePayload;
  override returnSchema = Type.Any();

  async _handle (payload: Static<typeof LikePayload>) {
    const { g_tk, cookie } = await publicApi(this).getQzoneAuth();
    return publicApi(this).setQzonePublicLike(cookie, g_tk, payload.feed, payload.enable);
  }
}

// 8. set_qzone_public_comment_like —— 空友评论/回复点赞
const CommentLikePayload = Type.Object({
  feed: FeedObject,
  comment: CommentObject,
  reply: ReplyObject,
  enable: Type.Boolean({ default: true }),
});
export class SetQzonePublicCommentLike extends OneBotAction<Static<typeof CommentLikePayload>, unknown> {
  override actionName = ActionName.SetQzonePublicCommentLike;
  override actionSummary = '空友评论/回复点赞';
  override actionDescription = '给空友评论点赞（like_type=2）或给楼中楼回复点赞（like_type=3）';
  override actionTags = ['扩展接口'];
  override payloadExample = { feed: {}, comment: {}, enable: true };
  override returnExample = {};
  override payloadSchema = CommentLikePayload;
  override returnSchema = Type.Any();

  async _handle (payload: Static<typeof CommentLikePayload>) {
    const { g_tk, cookie } = await publicApi(this).getQzoneAuth();
    return publicApi(this).setQzonePublicCommentLike(
      cookie, g_tk, payload.feed, payload.comment, payload.enable,
      payload.reply as Record<string, unknown> | undefined,
    );
  }
}

// 9. comment_qzone_public_feed —— 空友发评论
const CommentPayload = Type.Object({
  feed: FeedObject,
  user: UserObject,
  content: Type.Union([Type.String(), Type.Array(Type.Any())], { description: '评论内容：纯文本或富内容数组' }),
});
export class CommentQzonePublicFeed extends OneBotAction<Static<typeof CommentPayload>, unknown> {
  override actionName = ActionName.CommentQzonePublicFeed;
  override actionSummary = '空友发评论';
  override actionDescription = '给一条空友推荐动态发评论';
  override actionTags = ['扩展接口'];
  override payloadExample = { feed: {}, user: {}, content: '说得好' };
  override returnExample = {};
  override payloadSchema = CommentPayload;
  override returnSchema = Type.Any();

  async _handle (payload: Static<typeof CommentPayload>) {
    const { g_tk, cookie } = await publicApi(this).getQzoneAuth();
    return publicApi(this).commentQzonePublicFeed(
      cookie, g_tk, payload.feed,
      payload.user as Record<string, unknown>,
      payload.content as string | Record<string, unknown>[],
    );
  }
}

// 10. reply_qzone_public_feed —— 空友回复评论/楼中楼
const ReplyPayload = Type.Object({
  feed: FeedObject,
  user: UserObject,
  comment: CommentObject,
  content: Type.Union([Type.String(), Type.Array(Type.Any())], { description: '回复内容' }),
  reply: ReplyObject,
});
export class ReplyQzonePublicFeed extends OneBotAction<Static<typeof ReplyPayload>, unknown> {
  override actionName = ActionName.ReplyQzonePublicFeed;
  override actionSummary = '空友回复评论';
  override actionDescription = '在空友动态的评论线程里回复（可点名楼中楼目标）';
  override actionTags = ['扩展接口'];
  override payloadExample = { feed: {}, user: {}, comment: {}, content: '同意' };
  override returnExample = {};
  override payloadSchema = ReplyPayload;
  override returnSchema = Type.Any();

  async _handle (payload: Static<typeof ReplyPayload>) {
    const { g_tk, cookie } = await publicApi(this).getQzoneAuth();
    return publicApi(this).replyQzonePublicFeed(
      cookie, g_tk, payload.feed,
      payload.user as Record<string, unknown>,
      payload.comment as Record<string, unknown>,
      payload.content as string | Record<string, unknown>[],
      payload.reply as Record<string, unknown> | undefined,
    );
  }
}

// 11. delete_qzone_public_comment —— 删空友评论
const DelCommentPayload = Type.Object({ feed: FeedObject, comment: CommentObject });
export class DeleteQzonePublicComment extends OneBotAction<Static<typeof DelCommentPayload>, unknown> {
  override actionName = ActionName.DeleteQzonePublicComment;
  override actionSummary = '删空友评论';
  override actionDescription = '删除一条空友动态的评论（自己的评论）';
  override actionTags = ['扩展接口'];
  override payloadExample = { feed: {}, comment: {} };
  override returnExample = {};
  override payloadSchema = DelCommentPayload;
  override returnSchema = Type.Any();

  async _handle (payload: Static<typeof DelCommentPayload>) {
    const { g_tk, cookie } = await publicApi(this).getQzoneAuth();
    return publicApi(this).deleteQzonePublicComment(
      cookie, g_tk, payload.feed, payload.comment as Record<string, unknown>,
    );
  }
}

// 12. delete_qzone_public_reply —— 删空友楼中楼
const DelReplyPayload = Type.Object({ feed: FeedObject, comment: CommentObject, reply: Type.Any({ description: '回复对象（原样回传）' }) });
export class DeleteQzonePublicReply extends OneBotAction<Static<typeof DelReplyPayload>, unknown> {
  override actionName = ActionName.DeleteQzonePublicReply;
  override actionSummary = '删空友楼中楼';
  override actionDescription = '删除一条空友评论的楼中楼回复（自己的回复）';
  override actionTags = ['扩展接口'];
  override payloadExample = { feed: {}, comment: {}, reply: {} };
  override returnExample = {};
  override payloadSchema = DelReplyPayload;
  override returnSchema = Type.Any();

  async _handle (payload: Static<typeof DelReplyPayload>) {
    const { g_tk, cookie } = await publicApi(this).getQzoneAuth();
    return publicApi(this).deleteQzonePublicReply(
      cookie, g_tk, payload.feed,
      payload.comment as Record<string, unknown>,
      payload.reply as Record<string, unknown>,
    );
  }
}

// 13. set_qzone_public_follow —— 空友关注/取关
const FollowPayload = Type.Object({ feed: FeedObject, enable: Type.Boolean({ default: true }) });
export class SetQzonePublicFollow extends OneBotAction<Static<typeof FollowPayload>, unknown> {
  override actionName = ActionName.SetQzonePublicFollow;
  override actionSummary = '空友关注/取关';
  override actionDescription = '关注/取关一条空友动态的作者';
  override actionTags = ['扩展接口'];
  override payloadExample = { feed: {}, enable: true };
  override returnExample = {};
  override payloadSchema = FollowPayload;
  override returnSchema = Type.Any();

  async _handle (payload: Static<typeof FollowPayload>) {
    const { g_tk, cookie } = await publicApi(this).getQzoneAuth();
    return publicApi(this).setQzonePublicFollow(cookie, g_tk, payload.feed, payload.enable);
  }
}

// 14. forward_qzone_public_feed —— 转发空友动态
const ForwardPayload = Type.Object({ feed: FeedObject, reason: Type.String({ description: '转发理由/附言' }) });
export class ForwardQzonePublicFeed extends OneBotAction<Static<typeof ForwardPayload>, unknown> {
  override actionName = ActionName.ForwardQzonePublicFeed;
  override actionSummary = '转发空友动态';
  override actionDescription = '转发一条空友推荐动态到自己的空间';
  override actionTags = ['扩展接口'];
  override payloadExample = { feed: {}, reason: '转发' };
  override returnExample = {};
  override payloadSchema = ForwardPayload;
  override returnSchema = Type.Any();

  async _handle (payload: Static<typeof ForwardPayload>) {
    const { g_tk, cookie } = await publicApi(this).getQzoneAuth();
    return publicApi(this).forwardQzonePublicFeed(cookie, g_tk, payload.feed, payload.reason);
  }
}
