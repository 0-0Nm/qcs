/**
 * SnowCat · QQ空间好友动态流（feeds3_html_more）—— 纯数据构造与解析
 *
 * SnowLuma v2.2.1 (qzone-feed-cursor.ts + qzone-feed-content.ts + qzone.ts feeds 部分) 移植改造：
 * - cursor 状态编解码（base64url，绑 uin 防串号）
 * - HTML feed 内容解析（htmlparser2，不执行远程内容）
 * - feeds 响应映射
 */

// ─────────────── cursor 状态机 ───────────────

const numericFields = [
    'begintime',
    'dayspac',
    'pagenum',
    'aisortEndTime',
    'aisortOffset',
    'aisortBeginTime',
    'aisortNextTime',
    'icServerTime',
] as const;
const stringFields = ['externparam', 'daylist', 'uinlist'] as const;
const fields = [...numericFields, ...stringFields];
type StateField = (typeof fields)[number];
export type QzoneFeedState = Record<StateField, string>;

export function initialQzoneFeedState(): QzoneFeedState {
    return {
        begintime: '0',
        dayspac: '0',
        pagenum: '1',
        aisortEndTime: '0',
        aisortOffset: '0',
        aisortBeginTime: '0',
        aisortNextTime: '0',
        icServerTime: '0',
        externparam: '',
        daylist: '',
        uinlist: '',
    };
}

function record(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 承接 web 客户端用的字段，含不透明服务端状态。 */
export function nextQzoneFeedState(
    main: Record<string, unknown>,
    previous: QzoneFeedState,
): QzoneFeedState {
    const next = { ...previous };
    for (const field of numericFields) {
        const value = main[field];
        if (value === undefined || value === '') continue;
        if (
            (typeof value !== 'number' && typeof value !== 'string') ||
            !/^\d+$/.test(String(value)) ||
            !Number.isSafeInteger(Number(value)) ||
            (field === 'pagenum' && Number(value) < 1)
        ) {
            throw new Error(`空间好友动态分页字段异常: ${field}`);
        }
        next[field] = String(Number(value));
    }
    for (const field of stringFields) {
        const value = main[field];
        if (value === undefined || (value === '' && field !== 'uinlist')) continue;
        if (typeof value !== 'string' || value.length > 32_768) {
            throw new Error(`空间好友动态分页字段异常: ${field}`);
        }
        next[field] = value;
    }
    return next;
}

/** 服务端时钟单独不算翻页进度。 */
export function qzoneFeedPosition(state: QzoneFeedState): string {
    return JSON.stringify(
        fields.filter((field) => field !== 'icServerTime').map((field) => state[field]),
    );
}

export function encodeQzoneFeedCursor(uin: string, page: number, state: QzoneFeedState): string {
    if (!Number.isSafeInteger(page) || page < 2) {
        throw new Error('空间好友动态分页页码超出范围');
    }
    const cursor = Buffer.from(JSON.stringify({ version: 1, uin, page, state })).toString(
        'base64url',
    );
    if (cursor.length > 65_536) {
        throw new Error('空间好友动态分页游标过大');
    }
    return cursor;
}

export function decodeQzoneFeedCursor(
    cursor: string,
    uin: string,
): { page: number; state: QzoneFeedState } {
    if (!cursor || cursor.length > 65_536 || !/^[A-Za-z0-9_-]+$/.test(cursor)) {
        throw new Error('无效的空间好友动态 cursor');
    }
    let value: unknown;
    try {
        const bytes = Buffer.from(cursor, 'base64url');
        if (bytes.toString('base64url') !== cursor) {
            throw new Error('non-canonical encoding');
        }
        value = JSON.parse(bytes.toString('utf8'));
    } catch {
        throw new Error('无效的空间好友动态 cursor');
    }
    if (
        !record(value) ||
        value['version'] !== 1 ||
        value['uin'] !== uin ||
        typeof value['page'] !== 'number' ||
        !Number.isSafeInteger(value['page']) ||
        value['page'] < 2 ||
        !record(value['state'])
    ) {
        throw new Error('空间好友动态 cursor 无效或不属于当前账号');
    }
    const rawState = value['state'];
    if (
        Object.keys(rawState).length !== fields.length ||
        !fields.every((field) => typeof rawState[field] === 'string')
    ) {
        throw new Error('无效的空间好友动态 cursor 状态');
    }
    const state = nextQzoneFeedState(rawState, initialQzoneFeedState());
    if (fields.some((field) => state[field] !== rawState[field])) {
        throw new Error('无效的空间好友动态 cursor 状态');
    }
    return { page: value['page'], state };
}

// ─────────────── HTML feed 内容解析（htmlparser2，数据级不执行） ───────────────

import { DomUtils, parseDocument } from 'htmlparser2';

type Element = ReturnType<typeof DomUtils.findAll>[number];
type Node = ReturnType<typeof parseDocument>['children'][number];

export interface QzoneFeedContent {
    tid: string | null;
    content: string | null;
    content_complete: boolean | null;
    images: string[] | null;
    like_count: number | null;
    comment_count: number | null;
}

function hasClass(node: Element, name: string): boolean {
    return (node.attribs['class'] ?? '').split(/\s+/).includes(name);
}

function isContentNode(node: Element, root: Element): boolean {
    for (let parent = node.parent; parent && parent !== root; parent = parent.parent) {
        if (
            'attribs' in parent &&
            (hasClass(parent, 'mod-comments') ||
                hasClass(parent, 'comments-list') ||
                hasClass(parent, 'f-item-passive') ||
                hasClass(parent, 'f-ct-video'))
        ) {
            return false;
        }
    }
    return true;
}

function text(node: Element): string {
    const chunks: string[] = [];
    const stack: (Node | string)[] = [...node.children].reverse();
    while (stack.length) {
        const next = stack.pop()!;
        if (typeof next === 'string') {
            chunks.push(next);
        } else if (next.type === 'text') {
            chunks.push(next.data.replace(/\s+/g, ' '));
        } else if (next.type === 'tag') {
            if (next.attribs['data-cmd'] === 'qz_toggle' || hasClass(next, 'load_img')) {
                continue;
            }
            if (next.name === 'br') {
                chunks.push('\n');
            } else if (next.name === 'img') {
                chunks.push(next.attribs['alt'] ?? '');
            } else {
                if (['div', 'p', 'li'].includes(next.name)) {
                    chunks.push('\n');
                    stack.push('\n');
                }
                for (let i = next.children.length - 1; i >= 0; i--) {
                    const child = next.children[i];
                    if (child !== undefined) stack.push(child);
                }
            }
        }
    }
    return chunks
        .join('')
        .replace(/ *\n */g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function count(value: unknown): number | null {
    if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+$/.test(value))) {
        return null;
    }
    const number = Number(value);
    return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

function imageUrl(value: string | undefined): string | null {
    if (!value) return null;
    try {
        const url = new URL(value.startsWith('//') ? `https:${value}` : value);
        return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
    } catch {
        return null;
    }
}

/** 只抽帖子本身的内容；评论/头像/视频封面另算。 */
export function parseQzoneFeedContent(
    html: string,
    key: string,
    uin: number,
    appid: number,
    likeCount?: unknown,
    commentCount?: unknown,
): QzoneFeedContent {
    const doc = parseDocument(html);
    const elements = DomUtils.findAll(() => true, doc.children);
    const body = elements.find(
        (node) => hasClass(node, 'f-item') && node.attribs['data-key'] === key,
    );
    const result: QzoneFeedContent = {
        tid: null,
        content: null,
        content_complete: null,
        images: null,
        like_count: count(likeCount),
        comment_count: count(commentCount),
    };
    if (!body) return result;

    let root = body;
    for (let parent = body.parent; parent && 'attribs' in parent; parent = parent.parent) {
        if (hasClass(parent, 'f-single')) {
            root = parent;
            break;
        }
    }

    const bodyElements = DomUtils.findAll((node) => isContentNode(node, body), body.children);
    const metadata = bodyElements.find(
        (node) =>
            node.attribs['name'] === 'feed_data' &&
            node.attribs['data-uin'] === String(uin) &&
            node.attribs['data-fkey'] === key,
    );

    if (appid === 311 && metadata?.attribs['data-tid']) {
        result.tid = metadata.attribs['data-tid'];
    }

    const contentNodes = bodyElements.filter((node) => hasClass(node, 'f-info'));
    const complete = contentNodes.find(
        (node) => hasClass(node, 'qz_info_complete') && text(node) !== '',
    );
    const content = complete ?? contentNodes.find((node) => !hasClass(node, 'qz_info_complete'));

    if (content) {
        result.content = text(content);
        result.content_complete =
            !!complete ||
            !DomUtils.findAll((node) => node.attribs['data-cmd'] === 'qz_toggle', content.children)
                .length;
    }

    const images = new Set<string>();
    for (const item of bodyElements.filter((node) => hasClass(node, 'img-item'))) {
        if (item.attribs['data-v_itemid'] || item.attribs['data-videotype']) {
            continue;
        }
        const full = imageUrl(item.attribs['data-originurl'] ?? item.attribs['data-url3']);
        if (full) {
            images.add(full);
            continue;
        }
        for (const image of DomUtils.findAll((node) => node.name === 'img', item.children)) {
            const url = imageUrl(image.attribs['truesrc'] ?? image.attribs['src']);
            if (url) {
                images.add(url);
            }
        }
    }

    result.images = [...images];
    const like = DomUtils.findAll(
        (node) => hasClass(node, 'qz_like_btn_v3') && isContentNode(node, root),
        root.children,
    )[0];
    result.like_count ??= count(like?.attribs['data-likecnt']);
    return result;
}

// ─────────────── feeds 响应 shape 与映射 ───────────────

export interface RawFeedsItem {
    uin?: number | string;
    nickname?: string;
    abstime?: number | string;
    appid?: number | string;
    key?: string;
    feedskey?: string;
    html?: string;
    likecnt?: unknown;
    commentcnt?: unknown;
}

interface RawFeedsMain {
    hasMoreFeeds?: boolean | number | string;
    error?: string;
    [key: string]: unknown;
}

export interface RawFeedsResponse {
    code?: number;
    subcode?: number;
    message?: string;
    data?: {
        main?: RawFeedsMain | null;
        hasmore?: boolean | number | string;
        data?: (RawFeedsItem | null | undefined)[] | null;
    } | null;
}

export interface QzoneFeed {
    uin: number;
    nickname: string;
    time: number;
    appid: number;
    key: string;
    html: string;
}

export interface QzoneFeedWithContent extends QzoneFeed, QzoneFeedContent {}

export interface QzoneFeedsPage {
    feeds: QzoneFeedWithContent[];
    has_more: boolean;
    next_cursor: string | null;
}

function feedHasMore(data: RawFeedsResponse): boolean {
    const value = data.data?.main === undefined ? data.data?.hasmore : data.data?.main?.hasMoreFeeds;
    if (value === true || value === 1 || value === '1') return true;
    if (value === false || value === 0 || value === '0') return false;
    throw new Error('空间好友动态缺少有效的分页结束标志');
}

/** 纯映射；翻页续传由 getQzoneFeeds 接线。 */
export function mapQzoneFeeds(data: RawFeedsResponse): QzoneFeedsPage {
    if (!Array.isArray(data.data?.data)) {
        throw new Error('无法获取空间好友动态（响应结构异常）');
    }
    // web 载荷用 null/undefined 填充列表；这些不是 feed 条目
    const list = data.data.data.filter((item) => item != null);
    return {
        feeds: list.map((item) => {
            if (typeof item !== 'object' || Array.isArray(item)) {
                throw new Error('空间好友动态条目结构异常');
            }
            const feed: QzoneFeed = {
                uin: Number(item['uin'] ?? 0),
                nickname: String(item['nickname'] ?? ''),
                time: Number(item['abstime'] ?? 0),
                appid: Number(item['appid'] ?? 0),
                key: String(item['key'] ?? item['feedskey'] ?? ''),
                html: String(item['html'] ?? ''),
            };
            if (
                ![feed.uin, feed.time, feed.appid].every(
                    (n) => Number.isSafeInteger(n) && n >= 0,
                ) ||
                typeof feed.nickname !== 'string' ||
                typeof feed.html !== 'string'
            ) {
                throw new Error('空间好友动态条目字段异常');
            }
            return {
                ...feed,
                ...parseQzoneFeedContent(
                    feed.html,
                    feed.key,
                    feed.uin,
                    feed.appid,
                    item['likecnt'],
                    item['commentcnt'],
                ),
            };
        }),
        has_more: feedHasMore(data),
        next_cursor: null,
    };
}
