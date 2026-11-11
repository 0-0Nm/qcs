/**
 * SnowCat · QQ空间公共空间（空友推荐）Web 线 —— 纯数据构造与请求封装
 *
 * SnowLuma v2.2.1 (packages/protocol/src/web/qzone-public.ts) 移植改造：
 * - 走 h5.qzone.qq.com/http2rpc gotrpc 通道（trpc 服务 + x-oidb 命令头）
 * - cookie 串形态对齐 NapCat getQzoneAuth（p_uin/p_skey/skey/uin）
 * - cursor 编解码绑 uin 防串号
 */

export type QzonePublicContent = string | Record<string, unknown>[];

export interface QzonePublicFeedsPage {
    feeds: Record<string, unknown>[];
    has_more: boolean;
    next_cursor: string | null;
    [key: string]: unknown;
}

interface PublicFeedCursor {
    version: 1;
    uin: string;
    refresh_id: string;
    attach_info: string;
    last_client_feed_union_id: Record<string, unknown> | null;
}

const reader = 'trpc.qzone.feeds_reader.FeedsReader';
const interaction = 'trpc.qzone.interaction_writer.InteractionWriter';
const upvoteService = 'trpc.public_qzone.interaction.UFOComment';
const relation = 'trpc.public_qzone.relation.RelationService';

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** http2rpc 统一请求封装：retcode!=0或缺 data 抛错。 */
export async function qzonePublicRequest(
    cookie: string,
    bkn: string,
    service: string,
    method: string,
    oidb: string,
    params: Record<string, unknown>,
): Promise<Record<string, unknown>> {
    const [command, serviceType] = oidb.split('_');
    const { RequestUtil } = await import('snowcat-common/src/request');
    const result = await RequestUtil.HttpGetJson<unknown>(
        `https://h5.qzone.qq.com/http2rpc/gotrpc/v1/${service}/${method}?g_tk=${bkn}`,
        'POST',
        params,
        {
            Cookie: cookie,
            'Content-Type': 'application/json',
            Referer: 'https://h5.qzone.qq.com/pc-qzone/index.html',
            'x-web-qua': 'V1_HT5_QZ_9.9.32_001_IDC_B',
            'x-oidb': JSON.stringify({
                uint32_command: command,
                uint32_service_type: serviceType,
            }),
        },
    );

    if (!isObject(result) || result['retcode'] !== 0 || !isObject(result['data'])) {
        const code = isObject(result) ? result['retcode'] : 'invalid response';
        const message =
            isObject(result) && typeof result['message'] === 'string' ? result['message'] : '';
        throw new Error(`qzone public ${method} failed: retcode=${code} ${message}`.trim());
    }

    return result['data'];
}

/** 动态寻址参数：从 feed.cell_common.union_id 提取（完整动态才有）。 */
export function qzonePublicFeedParams(feed: Record<string, unknown>): Record<string, unknown> {
    const common = feed['cell_common'];

    if (!isObject(common) || !isObject(common['union_id']) || !Object.keys(common['union_id']).length) {
        throw new Error('空友动态缺少 cell_common.union_id，请使用推荐列表或详情返回的完整动态');
    }

    return {
        union_id: common['union_id'],
        ...(feed['cell_feed_transfer'] === undefined
            ? {}
            : { cell_feed_transfer: feed['cell_feed_transfer'] }),
    };
}

function encodeCursor(state: PublicFeedCursor): string {
    const cursor = Buffer.from(JSON.stringify(state)).toString('base64url');
    if (cursor.length > 65_536) {
        throw new Error('空友推荐分页游标过大');
    }
    return cursor;
}

function decodeCursor(cursor: string, uin: string): PublicFeedCursor {
    if (!cursor || cursor.length > 65_536 || !/^[A-Za-z0-9_-]+$/.test(cursor)) {
        throw new Error('无效的空友推荐 cursor');
    }
    let value: unknown;
    try {
        const bytes = Buffer.from(cursor, 'base64url');
        if (bytes.toString('base64url') !== cursor) {
            throw new Error('non-canonical encoding');
        }
        value = JSON.parse(bytes.toString('utf8'));
    } catch {
        throw new Error('无效的空友推荐 cursor');
    }
    if (
        !isObject(value) ||
        value['version'] !== 1 ||
        value['uin'] !== uin ||
        typeof value['refresh_id'] !== 'string' ||
        !value['refresh_id'] ||
        typeof value['attach_info'] !== 'string' ||
        !(value['last_client_feed_union_id'] === null || isObject(value['last_client_feed_union_id']))
    ) {
        throw new Error('空友推荐 cursor 无效或不属于当前账号');
    }
    return {
        version: 1,
        uin,
        refresh_id: value['refresh_id'],
        attach_info: value['attach_info'],
        last_client_feed_union_id: value['last_client_feed_union_id'] as Record<string, unknown> | null,
    };
}

/** 查询账号在空友各入口的白名单能力（entrances）。 */
export async function getQzonePublicCapabilities(
    cookie: string,
    bkn: string,
    selfUin: string,
): Promise<Record<string, unknown>> {
    const data = await qzonePublicRequest(
        cookie, bkn,
        'trpc.public_qzone.entrance_ctrl.EntranceCtrl',
        'BatchEntranceWhitelist',
        '0x9741_0',
        { uins: [selfUin], entrance_types: [1, 15] },
    );
    const result = Array.isArray(data['results'])
        ? (data['results'] as unknown[]).find(
            (entry) => isObject(entry) && String(entry['uin']) === selfUin,
        )
        : undefined;

    if (!isObject(result) || !isObject(result['entrances'])) {
        throw new Error('qzone public BatchEntranceWhitelist 缺少当前账号的 entrances');
    }
    return result['entrances'];
}

/** 空友推荐动态流（cursor 续翻；广告条不进续翻锚点）。 */
export async function getQzonePublicFeeds(
    cookie: string,
    bkn: string,
    selfUin: string,
    cursor?: string,
): Promise<QzonePublicFeedsPage> {
    const state: PublicFeedCursor =
        cursor === undefined
            ? {
                version: 1,
                uin: selfUin,
                refresh_id: `${selfUin}_${Date.now()}`,
                attach_info: '',
                last_client_feed_union_id: null,
            }
            : decodeCursor(cursor, selfUin);
    const data = await qzonePublicRequest(cookie, bkn, reader, 'GetPublicRecomFeeds', '0x9a38_0', {
        refresh_id: state.refresh_id,
        ...(cursor === undefined
            ? {}
            : {
                attach_info: state.attach_info,
                ...(state.last_client_feed_union_id === null
                    ? {}
                    : { last_client_feed_union_id: state.last_client_feed_union_id }),
            }),
    });

    if (!Array.isArray(data['feeds']) || typeof data['has_more'] !== 'boolean') {
        throw new Error('qzone public GetPublicRecomFeeds 分页响应异常');
    }

    const feeds = (data['feeds'] as unknown[]).map((entry) => {
        if (!isObject(entry) || !isObject(entry['feed'])) {
            throw new Error('qzone public GetPublicRecomFeeds 动态响应异常');
        }
        return entry['feed'] as Record<string, unknown>;
    });
    let lastUnion = state.last_client_feed_union_id;

    // web 客户端跨页携带最后一条非广告动态（含纯广告页）
    for (const feed of feeds) {
        const common = feed['cell_common'];
        if (isObject(common) && common['feed_type'] !== 3 && isObject(common['union_id'])) {
            lastUnion = common['union_id'] as Record<string, unknown>;
        }
    }

    let nextCursor: string | null = null;
    if (data['has_more']) {
        if (typeof data['attach_info'] !== 'string') {
            throw new Error('qzone public GetPublicRecomFeeds 缺少 attach_info');
        }
        nextCursor = encodeCursor({
            ...state,
            attach_info: data['attach_info'],
            last_client_feed_union_id: lastUnion,
        });
    }

    return { ...data, feeds, has_more: data['has_more'] as boolean, next_cursor: nextCursor };
}

/** 空友单条动态详情（含评论首屏）。 */
export function getQzonePublicFeedDetail(
    cookie: string,
    bkn: string,
    feed: Record<string, unknown>,
): Promise<Record<string, unknown>> {
    return qzonePublicRequest(cookie, bkn, reader, 'GetFeedDetail', '0x97b1_1', {
        ...qzonePublicFeedParams(feed),
        feed_action_domain_type: 3,
        from_page: 1,
    });
}

/** 空友评论分页（cursor 用详情/上页返回的 attach_info）。 */
export function getQzonePublicComments(
    cookie: string,
    bkn: string,
    feed: Record<string, unknown>,
    cursor: string,
): Promise<Record<string, unknown>> {
    return qzonePublicRequest(cookie, bkn, reader, 'GetComment', '0x9bfd_1', {
        ...qzonePublicFeedParams(feed),
        attach_info: cursor,
    });
}

/** 空友楼中楼回复分页。 */
export function getQzonePublicReplies(
    cookie: string,
    bkn: string,
    feed: Record<string, unknown>,
    comment: Record<string, unknown>,
    cursor: string,
    pageSize: number,
): Promise<Record<string, unknown>> {
    return qzonePublicRequest(cookie, bkn, reader, 'GetReplies', '0x9bfe_1', {
        ...qzonePublicFeedParams(feed),
        cur_comment: comment,
        comment_attach_info: '',
        reply_attach_info: cursor || comment['reply_attach_info'] || '',
        page_size: pageSize,
    });
}

/** 空友点赞/取消赞（UFOComment Upvote/Downvote）。 */
export async function setQzonePublicUpvote(
    cookie: string,
    bkn: string,
    feed: Record<string, unknown>,
    enable: boolean,
): Promise<Record<string, unknown>> {
    const data = await qzonePublicRequest(
        cookie, bkn,
        upvoteService,
        enable ? 'Upvote' : 'Downvote',
        enable ? '0x9d18_1' : '0x9d19_1',
        qzonePublicFeedParams(feed),
    );
    if (!data['upvote']) {
        throw new Error('qzone public upvote 响应缺少 upvote');
    }
    return data;
}

async function setLike(
    cookie: string,
    bkn: string,
    feed: Record<string, unknown>,
    likeKey: unknown,
    likeType: number,
    enable: boolean,
): Promise<Record<string, unknown>> {
    if (typeof likeKey !== 'string' || !likeKey) {
        throw new Error('空友点赞目标缺少 like_key');
    }
    const data = await qzonePublicRequest(
        cookie, bkn,
        interaction,
        enable ? 'DoLike' : 'UnLike',
        enable ? '0x9699_1' : '0x969c_1',
        {
            ...qzonePublicFeedParams(feed),
            like_key: likeKey,
            like_type: likeType,
        },
    );
    if (!data['like']) {
        throw new Error('qzone public like 响应缺少 like');
    }
    return data;
}

/** 空友动态点赞/取消赞（like_type=1，key 取 cell_common.cur_like_key）。 */
export function setQzonePublicLike(
    cookie: string,
    bkn: string,
    feed: Record<string, unknown>,
    enable: boolean,
): Promise<Record<string, unknown>> {
    const common = feed['cell_common'];
    return setLike(cookie, bkn, feed, isObject(common) ? common['cur_like_key'] : undefined, 1, enable);
}

/** 空友评论/回复点赞（like_type：评论=2，回复=3，key 取 like.id）。 */
export function setQzonePublicCommentLike(
    cookie: string,
    bkn: string,
    feed: Record<string, unknown>,
    comment: Record<string, unknown>,
    enable: boolean,
    reply?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
    const like = (reply ?? comment)['like'];
    return setLike(cookie, bkn, feed, isObject(like) ? like['id'] : undefined, reply ? 3 : 2, enable);
}

function richContent(content: QzonePublicContent): Record<string, unknown>[] {
    return typeof content === 'string' ? [{ type: 0, content }] : content;
}

/** 空友发评论。user 为评论者身份对象（详情/列表响应里取，或 {uid,uin,nickname} 形态）。 */
export async function commentQzonePublicFeed(
    cookie: string,
    bkn: string,
    feed: Record<string, unknown>,
    user: Record<string, unknown>,
    content: QzonePublicContent,
): Promise<Record<string, unknown>> {
    const data = await qzonePublicRequest(cookie, bkn, interaction, 'AddComment', '0x9676_1', {
        ...qzonePublicFeedParams(feed),
        comment: { user, content: richContent(content) },
    });
    if (!data['comment']) {
        throw new Error('qzone public AddComment 响应缺少 comment');
    }
    return data;
}

/** 空友回复评论/楼中楼。点名对象自动取 reply?.user ?? comment.user。 */
export async function replyQzonePublicFeed(
    cookie: string,
    bkn: string,
    feed: Record<string, unknown>,
    user: Record<string, unknown>,
    comment: Record<string, unknown>,
    content: QzonePublicContent,
    reply?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
    const targetUser = reply?.['user'] ?? comment['user'];
    if (!isObject(targetUser)) {
        throw new Error('空友评论或回复缺少 user');
    }
    const data = await qzonePublicRequest(cookie, bkn, interaction, 'AddReply', '0x9677_1', {
        ...qzonePublicFeedParams(feed),
        comment,
        reply: { content: richContent(content), target_user: targetUser, user },
    });
    if (!data['reply']) {
        throw new Error('qzone public AddReply 响应缺少 reply');
    }
    return data;
}

/** 删空友评论。 */
export function deleteQzonePublicComment(
    cookie: string,
    bkn: string,
    feed: Record<string, unknown>,
    comment: Record<string, unknown>,
): Promise<Record<string, unknown>> {
    return qzonePublicRequest(cookie, bkn, interaction, 'DeleteComment', '0x9989_0', {
        ...qzonePublicFeedParams(feed),
        comment,
    });
}

/** 删空友楼中楼回复。 */
export function deleteQzonePublicReply(
    cookie: string,
    bkn: string,
    feed: Record<string, unknown>,
    comment: Record<string, unknown>,
    reply: Record<string, unknown>,
): Promise<Record<string, unknown>> {
    return qzonePublicRequest(cookie, bkn, interaction, 'DeleteReply', '0x998a_0', {
        ...qzonePublicFeedParams(feed),
        comment,
        reply,
    });
}

/** 空友关注/取关作者（domain_type=3 且有 uid 用 uid，否则用 uin）。 */
export async function setQzonePublicFollow(
    cookie: string,
    bkn: string,
    feed: Record<string, unknown>,
    enable: boolean,
): Promise<Record<string, unknown>> {
    const params = qzonePublicFeedParams(feed);
    const common = feed['cell_common'] as Record<string, unknown>;
    const user = isObject(feed['cell_user_info']) ? (feed['cell_user_info'] as Record<string, unknown>)['user'] : undefined;
    const uid = isObject(user) && typeof user['uid'] === 'string' ? user['uid'].trim() : '';
    const uin = isObject(user) && typeof user['uin'] === 'string' ? user['uin'].trim() : '';
    const useUid = (common['domain_type'] === 3 && !!uid) || !uin;

    if (useUid ? !uid : !uin) {
        throw new Error('空友动态缺少作者 uid/uin');
    }

    const union = params['union_id'] as Record<string, unknown>;
    const data = await qzonePublicRequest(
        cookie, bkn,
        relation,
        enable ? 'Follow' : 'Unfollow',
        enable ? '0x9d1a_1' : '0x9d1b_1',
        {
            follow_from_type: 1,
            ...(useUid ? { target_uid: uid } : { target_uin: uin }),
            ...(union['uf_key'] ? { follow_feed_id: union['uf_key'] } : {}),
            ...(feed['cell_feed_transfer'] === undefined
                ? {}
                : { cell_feed_transfer: feed['cell_feed_transfer'] }),
        },
    );

    if (
        data['ret_code'] !== undefined &&
        data['ret_code'] !== null &&
        data['ret_code'] !== 0 &&
        data['ret_code'] !== '0'
    ) {
        throw new Error(
            `qzone public follow failed: ret_code=${data['ret_code']} ${data['ret_msg'] ?? ''}`.trim(),
        );
    }
    return data;
}

/** 转发空友动态。 */
export function forwardQzonePublicFeed(
    cookie: string,
    bkn: string,
    feed: Record<string, unknown>,
    reason: string,
): Promise<Record<string, unknown>> {
    return qzonePublicRequest(cookie, bkn, 'trpc.qzone.feeds_writer.FeedsWriter', 'ForwardFeed', '0x969a_1', {
        ...qzonePublicFeedParams(feed),
        reason,
    });
}
