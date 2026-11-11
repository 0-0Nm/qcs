/**
 * SnowCat · QQ空间(Qzone)个人空间 Web 线 —— 纯数据构造与解析
 *
 * 从 SnowLuma v2.2.1 (packages/protocol/src/web/qzone.ts) 移植改造：
 * - SnowCat 已有 buildQzoneUploadImageBody/buildQzonePublishBody/buildQzoneDeleteBody
 *   （data/qzone.ts 原件保留），本文件只补缺的：读列表/详情/点赞/评论/回复/资料/拉黑/权限。
 * - 不发起任何网络请求，方便单独测试（对齐 data/qzone.ts 头注）。
 * - 统一走 NapCat 的 cookie 串（getQzoneAuth 产出的 p_uin/p_skey/skey/uin 形态），
 *   不用 SnowLuma 的 cookieObject Record 形态——但保留 tolerant 解析器。
 */

// ─────────────── tolerant JSON/JSONP 解析（SnowLuma 原样移植） ───────────────

/**
 * 解析 Qzone CGI body：可能是裸 JSON，也可能是 JSONP 回调包裹
 * （`_Callback({...});` / `frameElement.callback({...});` / `back({...})`）。
 * 分层 fallback：直接 JSON.parse {} 切片 → back({...}) → 末个 back(...) 提取。
 * 无对象体时抛错（如 HTML 错误页）。
 */
export function parseQzoneJson<T>(text: string): T {
    const s = text.trim();

    // 1st: 直接 JSON.parse {} 切片
    try {
        const start = s.indexOf('{');
        const end = s.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
            return JSON.parse(s.slice(start, end + 1)) as T;
        }
    } catch { /* fallback */ }

    // 2nd: back({...}) 整体
    try {
        const start = s.indexOf('back({');
        const end = s.lastIndexOf('})');
        if (start !== -1 && end !== -1 && end > start) {
            return JSON.parse(s.slice(start + 5, end + 1)) as T;
        }
    } catch { /* fallback */ }

    // 3rd: 找最后一个 back(...)，取内部 {}
    const backStart = s.lastIndexOf('back(');
    if (backStart === -1) {
        throw new Error('invalid response from qzone api');
    }
    const callEnd = s.indexOf(');', backStart);
    if (callEnd === -1) {
        throw new Error('invalid response from qzone api');
    }
    const inner = s.slice(backStart + 5, callEnd).trim();
    const braceStart = inner.indexOf('{');
    const braceEnd = inner.lastIndexOf('}');
    if (braceStart === -1 || braceEnd === -1 || braceEnd < braceStart) {
        throw new Error('invalid response from qzone api');
    }
    return JSON.parse(inner.slice(braceStart, braceEnd + 1)) as T;
}

/**
 * 解析 feeds3_html_more 的 JS 对象字面量载荷（不执行）。
 * `_preloadCallback({ … })` 的 data 用无引号键/单引号串/\xNN 转义/字面 undefined
 * ——给浏览器回调 eval 用的，JSON.parse 咽不下。替代 eval（vm 沙箱不是安全边界），
 * 递归下降把字面量当数据解析。`__proto__` 键丢弃（防原型污染）。
 * SnowLuma 原样移植。
 */
export function parseJsLiteral(src: string): unknown {
    let i = 0;
    const n = src.length;
    const isWs = (c: string): boolean =>
        c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f' || c === '\v';

    const skipWs = (): void => {
        while (i < n && isWs(src[i]!)) i++;
    };

    function parseString(quote: string): string {
        i++; // 开引号
        let out = '';
        while (i < n) {
            const c = src[i]!;
            if (c === '\\') {
                const e = src[i + 1];
                if (e === 'x') {
                    out += String.fromCharCode(parseInt(src.slice(i + 2, i + 4), 16));
                    i += 4;
                    continue;
                }
                if (e === 'u') {
                    out += String.fromCharCode(parseInt(src.slice(i + 2, i + 6), 16));
                    i += 6;
                    continue;
                }
                const simple: Record<string, string> = {
                    n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', '0': '\0',
                };
                out += e !== undefined ? (simple[e] ?? e) : '';
                i += 2;
                continue;
            }
            if (c === quote) {
                i++;
                return out;
            }
            out += c;
            i++;
        }
        throw new Error('unterminated string in qzone feeds payload');
    }

    function parseKey(): string {
        skipWs();
        const c = src[i];
        if (c === '"' || c === "'") return parseString(c);
        let s = '';
        while (i < n && /[A-Za-z0-9_$]/.test(src[i]!)) {
            s += src[i];
            i++;
        }
        if (!s) throw new Error('expected object key in qzone feeds payload');
        return s;
    }

    function parseObject(): Record<string, unknown> {
        i++; // {
        const obj: Record<string, unknown> = {};
        skipWs();
        if (src[i] === '}') { i++; return obj; }
        for (;;) {
            const key = parseKey();
            skipWs();
            if (src[i] !== ':') throw new Error('expected ":" in qzone feeds payload');
            i++;
            const value = parseValue();
            if (key !== '__proto__') obj[key] = value;
            skipWs();
            const ch = src[i];
            if (ch === ',') {
                i++;
                skipWs();
                if (src[i] === '}') { i++; return obj; }
                continue;
            }
            if (ch === '}') { i++; return obj; }
            throw new Error('expected "," or "}" in qzone feeds payload');
        }
    }

    function parseArray(): unknown[] {
        i++; // [
        const arr: unknown[] = [];
        skipWs();
        if (src[i] === ']') { i++; return arr; }
        for (;;) {
            arr.push(parseValue());
            skipWs();
            const ch = src[i];
            if (ch === ',') {
                i++;
                skipWs();
                if (src[i] === ']') { i++; return arr; }
                continue;
            }
            if (ch === ']') { i++; return arr; }
            throw new Error('expected "," or "]" in qzone feeds payload');
        }
    }

    function parseValue(): unknown {
        skipWs();
        const c = src[i];
        if (c === undefined) throw new Error('unexpected end of qzone feeds payload');
        if (c === '{') return parseObject();
        if (c === '[') return parseArray();
        if (c === '"' || c === "'") return parseString(c);
        let token = '';
        while (i < n && !/[,}\]:\s]/.test(src[i]!)) {
            token += src[i];
            i++;
        }
        if (token === 'true') return true;
        if (token === 'false') return false;
        if (token === 'null') return null;
        if (token === 'undefined') return undefined;
        if (token !== '') {
            const num = Number(token);
            if (!Number.isNaN(num)) return num;
        }
        throw new Error('unexpected token in qzone feeds payload: ' + token.slice(0, 20));
    }

    return parseValue();
}

/**
 * 提取 Qzone feeds JSONP body 回调实参对象，按数据解析（不执行）。
 * 从首个 `{` 切片解析一个平衡值；尾部 `);` 忽略。非对象体抛错。
 */
export function parseQzoneCallback<T>(text: string): T {
    const start = text.indexOf('{');
    if (start === -1) {
        throw new Error('invalid feeds response from qzone api');
    }
    const value = parseJsLiteral(text.slice(start));
    if (value === null || typeof value !== 'object') {
        throw new Error('invalid feeds response from qzone api');
    }
    return value as T;
}

// ─────────────── 原始响应 shape（taotao emotion_cgi_msglist_v6） ───────────────

interface RawPic {
    url1?: string;
    url2?: string;
    url3?: string;
    smallurl?: string;
}

interface RawEmotion {
    tid?: string;
    content?: string;
    created_time?: number;
    cmtnum?: number;
    secret?: number;
    pic?: RawPic[];
}

export interface RawMsgListResponse {
    code?: number;
    subcode?: number;
    message?: string;
    total?: number;
    msglist?: RawEmotion[] | null;
}

// ─────────────── OneBot 面向 shape ───────────────

/** 一条说说，规范化后对 OneBot 友好的形态。 */
export interface QzoneEmotion {
    tid: string;
    content: string;
    /** 发帖 unix 秒 */
    time: number;
    comment_num: number;
    /** 仅自己可见标记 */
    is_private: boolean;
    /** 每张图取最大可用的 URL */
    images: string[];
}

export interface QzoneMsgListResult {
    /** 该账号说说总数（非本页数量） */
    total: number;
    msglist: QzoneEmotion[];
}

export interface QzoneProfile {
    name: string;
    description: string;
}

export interface QzoneProfileUpdate {
    name?: string;
    description?: string;
}

export interface QzoneCommentReply {
    uin: number;
    name: string;
    /** unix 秒 */
    time: number;
    content: string;
    /** 在所属说说（或父评论）内唯一 */
    comment_id: string;
}

export interface QzoneComment extends QzoneCommentReply {
    /** Qzone 内联附带的回复；可能不含全部回复 */
    replies: QzoneCommentReply[];
}

export interface QzoneMsgDetailResult {
    tid: string;
    content: string;
    /** 服务端总数，非本页评论数 */
    comment_num: number;
    comments: QzoneComment[];
}

function pickPicUrl(pic: RawPic): string | undefined {
    return pic.url1 ?? pic.url2 ?? pic.url3 ?? pic.smallurl;
}

/** 纯映射：msglist_v6 → 规范化列表。 */
export function mapQzoneMsgList(data: RawMsgListResponse): QzoneMsgListResult {
    const list = data.msglist ?? [];
    return {
        total: Number(data.total ?? list.length),
        msglist: list.map((e) => ({
            tid: String(e.tid ?? ''),
            content: e.content ?? '',
            time: Number(e.created_time ?? 0),
            comment_num: Number(e.cmtnum ?? 0),
            is_private: Number(e.secret ?? 0) !== 0,
            images: (e.pic ?? []).map(pickPicUrl).filter((u): u is string => !!u),
        })),
    };
}

// ─────────────── 说说列表路由（双路防 -10000 限频） ───────────────

export interface QzoneRoute {
    url: string;
    headers: Record<string, string>;
}

/** 主路（legacy）：h5.qzone.qq.com → taotao.qzone.qq.com。 */
export function legacyMsgListRoute(
    cookie: string,
    targetUin: string,
    pos: number,
    num: number,
    bkn: string,
): QzoneRoute {
    const url = `https://h5.qzone.qq.com/proxy/domain/taotao.qzone.qq.com/cgi-bin/emotion_cgi_msglist_v6?${new URLSearchParams(
        {
            uin: targetUin,
            ftype: '0',
            sort: '0',
            pos: String(pos),
            num: String(num),
            replynum: '100',
            g_tk: bkn,
            callback: '_preloadCallback',
            code_version: '1',
            format: 'jsonp',
            need_private_comment: '1',
        },
    ).toString()}`;
    return { url, headers: { Cookie: cookie } };
}

/** 备路：user.qzone.qq.com → taotao.qq.com（注意域不同）。实测不吃 legacy 路的 -10000 限频。 */
export function userMsgListRoute(
    cookie: string,
    targetUin: string,
    pos: number,
    num: number,
    bkn: string,
): QzoneRoute {
    const url = `https://user.qzone.qq.com/proxy/domain/taotao.qq.com/cgi-bin/emotion_cgi_msglist_v6?${new URLSearchParams(
        {
            uin: targetUin,
            ftype: '0',
            sort: '0',
            pos: String(pos),
            num: String(num),
            g_tk: bkn,
            code_version: '1',
            format: 'json',
        },
    ).toString()}`;
    return {
        url,
        headers: {
            Cookie: cookie,
            Referer: `https://user.qzone.qq.com/${targetUin}`,
        },
    };
}

// ─────────────── 权限/目标校验 ───────────────

export const QZONE_UGC_RIGHTS = new Set<number>([1, 4, 16, 64, 128]);

export function normalizeQzoneUgcRight(ugcRight: number): number {
    if (!QZONE_UGC_RIGHTS.has(ugcRight)) {
        throw new Error('ugc_right must be one of 1, 4, 16, 64, 128');
    }
    return ugcRight;
}

export function normalizeTargetUins(targetUins?: string | number[]): string {
    const raw = Array.isArray(targetUins)
        ? targetUins.join('|')
        : (targetUins ?? '').trim();
    if (!raw) return '';
    const seen = new Set<string>();
    for (const part of raw.split('|')) {
        const uin = part.trim();
        if (!uin) continue;
        if (!/^\d+$/.test(uin)) {
            throw new Error('target_uins must contain QQ numbers separated by |');
        }
        seen.add(uin);
    }
    return [...seen].join('|');
}

// ─────────────── 发说说 body（SnowCat 已有 buildQzonePublishBody，此处为富参版） ───────────────

export interface RawPublishResponse {
    code?: number;
    subcode?: number;
    message?: string;
    // publish_v6 成功包络把新 feed id 命名为 t1_tid、时间 t1_time（字符串）。
    // tid/now 是防御性 fallback，t1_tid 才是主名。
    t1_tid?: string;
    t1_time?: string;
    tid?: string;
    now?: number;
}

export interface QzonePublishResult {
    tid: string;
    time: number;
}

/** 解析发说说响应，提取 tid+time。code!=0 或缺 tid 都抛错。 */
export function parseQzonePublishFull(text: string): QzonePublishResult {
    const data = parseQzoneJson<RawPublishResponse>(text);
    if (typeof data.code === 'number' && data.code !== 0) {
        throw new Error(`qzone publish failed: code=${data.code} ${data.message ?? ''}`.trim());
    }
    const tid = data.t1_tid ?? data.tid;
    if (!tid) {
        throw new Error('发表说说失败：响应缺少 tid');
    }
    return { tid: String(tid), time: Number(data.t1_time ?? data.now ?? 0) };
}

// ─────────────── 点赞/取消赞（internal_dolike_app） ───────────────

export interface RawLikeResponse {
    code?: number;
    subcode?: number;
    message?: string;
}

/** 构造点赞/取消赞表单体。unikey/curkey 定位说说（mood, appid 311），fid=tid。 */
export function buildQzoneLikeBody(
    opUin: string,
    targetUin: string,
    tid: string,
    abstime = 0,
): string {
    const unikey = `http://user.qzone.qq.com/${targetUin}/mood/${tid}`;
    return new URLSearchParams({
        qzreferrer: `https://user.qzone.qq.com/${opUin}`,
        opuin: opUin,
        unikey,
        curkey: unikey,
        appid: '311',
        typeid: '0',
        abstime: String(abstime),
        fid: tid,
        from: '1',
        active: '0',
        fupdate: '1',
        format: 'json',
    }).toString();
}

/** 解析点赞响应：非零 code/subcode 抛错。 */
export function parseQzoneLikeResponse(text: string, verb: string): void {
    const data = parseQzoneJson<RawLikeResponse>(text);
    if (typeof data.code === 'number' && data.code !== 0) {
        throw new Error(`qzone ${verb} failed: code=${data.code} ${data.message ?? ''}`.trim());
    }
    if (typeof data.subcode === 'number' && data.subcode !== 0) {
        throw new Error(`qzone ${verb} failed: subcode=${data.subcode} ${data.message ?? ''}`.trim());
    }
}

// ─────────────── 评论说说（emotion_cgi_re_feeds） ───────────────

interface RawCommentResponse {
    code?: number;
    subcode?: number;
    message?: string;
    commentid?: string | number;
    commentId?: string | number;
}

export interface QzoneCommentResult {
    /** 新评论 id（响应缺失时为 ''——code 0 不算失败） */
    comment_id: string;
}

export interface QzoneReplyTarget {
    /** 顶层评论 id（即便回复的是它的楼中楼） */
    commentId: string;
    commentUin: string;
    /** 可选：楼中楼里点名的作者 */
    replyTo?: { uin: string; name: string };
}

export interface QzoneReplyResult extends QzoneCommentResult {
    parent_comment_id: string;
    parent_comment_uin: number;
}

/** 构造评论说说表单体。topicId 形如 `<hostUin>_<tid>__1`（__1 后缀为社区实现主流形态）。 */
export function buildQzoneCommentBody(
    selfUin: string,
    hostUin: string,
    tid: string,
    content: string,
    richType?: number,
    richval?: string,
): string {
    return new URLSearchParams({
        qzreferrer: `https://user.qzone.qq.com/${selfUin}`,
        inCharset: 'utf-8',
        outCharset: 'utf-8',
        hostUin,
        format: 'json',
        ref: 'feeds',
        topicId: `${hostUin}_${tid}__1`,
        feedsType: '100',
        private: '0',
        paramstr: '1',
        richtype: richType !== undefined ? String(richType) : '',
        richval: richval ?? '',
        isSignIn: '',
        uin: selfUin,
        content,
        plat: 'qzone',
        source: 'ic',
        platformid: '52',
    }).toString();
}

/** 解析评论响应。 */
export function parseQzoneCommentResponse(text: string, hostUin: string, tid: string): QzoneCommentResult {
    const data = parseQzoneJson<RawCommentResponse>(text);
    if (typeof data.code === 'number' && data.code !== 0) {
        throw new Error(`qzone comment failed: code=${data.code} ${data.message ?? ''}`.trim());
    }
    if (typeof data.subcode === 'number' && data.subcode !== 0) {
        throw new Error(`qzone comment failed: subcode=${data.subcode} ${data.message ?? ''}`.trim());
    }
    const commentId = data.commentid ?? data.commentId;
    void hostUin; void tid; // 日志参数留位
    return { comment_id: commentId !== undefined ? String(commentId) : '' };
}

/** 构造楼中楼回复表单体（独立端点 emotion_cgi_addreply_ugc）。 */
export function buildQzoneReplyBody(
    selfUin: string,
    hostUin: string,
    tid: string,
    content: string,
    target: QzoneReplyTarget,
): string {
    let replyContent = content;
    if (target.replyTo !== undefined) {
        const { uin, name } = target.replyTo;
        // 对齐 web 编辑器的 @ 提及编码
        const escapedName = name
            .trim()
            .replace(/%/g, '%25')
            .replace(/,/g, '%2C')
            .replace(/}/g, '%7D');
        replyContent = `@{uin:${uin},nick:${escapedName},auto:1} ${content}`;
    }
    return new URLSearchParams({
        uin: selfUin,
        hostUin,
        hostuin: selfUin,
        topicId: `${hostUin}_${tid}`,
        commentId: target.commentId,
        commentUin: target.commentUin,
        content: replyContent,
        inCharset: 'utf-8',
        outCharset: 'utf-8',
        ref: '',
        code_version: '1',
        format: 'fs',
        qzreferrer: `https://user.qzone.qq.com/${hostUin}`,
    }).toString();
}

// ─────────────── 拉黑/解拉黑（cgi_black_action_new） ───────────────

interface RawBlackActionResponse {
    code?: number;
    subcode?: number;
    message?: string;
    msg?: string;
}

/** 构造空间拉黑表单体。action=1 拉黑，action=2 解拉黑。 */
export function buildQzoneBlackBody(selfUin: string, targetUin: string, ban: boolean): string {
    return new URLSearchParams({
        uin: selfUin,
        act_uin: targetUin,
        action: ban ? '1' : '2',
        fupdate: '1',
        qzreferrer: `https://user.qzone.qq.com/${selfUin}/main`,
    }).toString();
}

/** 解析拉黑响应（响应带 {name:"Ack"} 无引号键碎片，先补引号再解析）。 */
export function parseQzoneBlackResponse(text: string, ban: boolean): void {
    const verb = ban ? 'ban' : 'unban';
    let data: RawBlackActionResponse;
    try {
        data = parseQzoneJson<RawBlackActionResponse>(text.replace(/\{\s*name\s*:/, '{"name":'));
    } catch {
        const snippet = text.trim().slice(0, 300);
        throw new Error(`qzone ${verb} failed: ${snippet}${text.length > 300 ? '…' : ''}`);
    }
    const msg = data.message ?? data.msg ?? '';
    if (typeof data.subcode === 'number' && data.subcode !== 0) {
        throw new Error(`qzone ${verb} failed: subcode=${data.subcode} ${msg}`.trim());
    }
    if (typeof data.code === 'number' && data.code !== 0) {
        throw new Error(`qzone ${verb} failed: code=${data.code} ${msg}`.trim());
    }
}

// ─────────────── 说说详情（emotion_cgi_msgdetail_v6） ───────────────

interface RawMsgDetailPic {
    pic_id?: string;
    pictype?: number | string;
    type?: number | string;
    height?: number | string;
    b_height?: number | string;
    width?: number | string;
    b_width?: number | string;
    smallurl?: string;
    url1?: string;
    url2?: string;
    url3?: string;
}

export interface RawMsgDetailResponse {
    code?: number;
    subcode?: number;
    message?: string;
    msg?: string;
    tid?: string;
    uin?: number | string;
    content?: string;
    cmtnum?: unknown;
    commentlist?: unknown;
    conlist?: Array<{ con?: string }> | null;
    pic?: RawMsgDetailPic[] | null;
    richtype?: number | string;
    richval?: string;
    pic_template?: string;
    special_url?: string;
    t1_subtype?: number | string;
    subrichtype?: number | string;
    feedversion?: number | string;
    ver?: number | string;
    ugc_right?: number | string;
    to_sign?: number | string;
    ugcright_id?: string;
    code_version?: number | string;
}

export interface RawUpdateResponse {
    code?: number;
    subcode?: number;
    message?: string;
    msg?: string;
    ugc_right?: number | string;
}

export interface QzoneUpdateRightResult {
    /** 更新后的 ugc_right（服务端回显时用回显值） */
    ugc_right: number;
}

/** 构造详情 GET 查询串（注意代理域是 taotao.qq.com 非 taotao.qzone.qq.com）。 */
export function buildQzoneMsgDetailQuery(
    targetUin: string,
    tid: string,
    bkn: string,
    page?: { pos: number; num: number },
): string {
    return new URLSearchParams({
        tid,
        uin: targetUin,
        t1_source: '1',
        not_trunc_con: '1',
        need_right: '1',
        not_adapt_outpic: '1',
        g_tk: bkn,
        ...(page ? { pos: String(page.pos), num: String(page.num) } : {}),
    }).toString();
}

/** 从 msgdetail_v6 响应重建 emotion_cgi_update 全量载荷（php-qzone buildUpdatePayloadFromDetail 逐字段移植）。 */
export function buildQzoneUpdatePayload(
    detail: RawMsgDetailResponse,
    selfUin: string,
): URLSearchParams {
    if (!detail.tid) {
        throw new Error('qzone msg detail is missing tid');
    }

    const pics = detail.pic ?? [];
    const richtype =
        detail.richtype !== undefined ? Number(detail.richtype) : pics.length === 0 ? '' : 1;
    const richvals: string[] = [];
    const picBoItems: string[] = [];

    for (const pic of pics) {
        const picId = String(pic.pic_id ?? '');
        if (!picId) continue;
        const parts = picId.split(',');
        const albumId = parts[1] ?? '';
        const lloc = parts[2] ?? '';
        if (!albumId || !lloc) {
            throw new Error('qzone msg detail has unsupported pic info');
        }
        const sloc = lloc;
        const picType = String(pic.pictype ?? pic.type ?? 22);
        const height = String(pic.height ?? pic.b_height ?? 0);
        const width = String(pic.width ?? pic.b_width ?? 0);
        richvals.push(`,${albumId},${lloc},${sloc},${picType},${height},${width},,0,0`);

        for (const urlKey of ['smallurl', 'url1', 'url2', 'url3'] as const) {
            const picUrl = pic[urlKey];
            if (!picUrl) continue;
            const match = /[?&]bo=([^&#]+)/.exec(picUrl);
            if (match) {
                picBoItems.push(decodeURIComponent(match[1]!));
                break;
            }
        }
    }

    if (richtype === 1 && richvals.length === 0) {
        throw new Error('qzone image post detail is missing pic info');
    }

    let content = detail.content ?? '';
    const conParts = (detail.conlist ?? [])
        .map((c) => c.con)
        .filter((c): c is string => c !== undefined);
    if (conParts.length > 0) {
        content = conParts.join('').trim();
    }

    const subrichtype = detail.t1_subtype ?? detail.subrichtype ?? (richvals.length === 0 ? '' : 1);
    const boGroup = picBoItems.join(',');
    const picBo = boGroup ? `${boGroup}\t${boGroup}` : '';

    const hostuin = String(detail.uin ?? selfUin);
    return new URLSearchParams({
        syn_tweet_verson: '1',
        tid: String(detail.tid),
        paramstr: '1',
        pic_template: detail.pic_template ?? '',
        richtype: String(richtype),
        richval: richvals.length > 0 ? richvals.join('\t') : (detail.richval ?? ''),
        special_url: detail.special_url ?? '',
        subrichtype: String(subrichtype),
        pic_bo: picBo,
        con: content,
        feedversion: String(detail.feedversion ?? 1),
        ver: String(detail.ver ?? 1),
        ugc_right: String(Number(detail.ugc_right ?? 1)),
        to_sign: String(Number(detail.to_sign ?? 0)),
        ugcright_id: String(detail.ugcright_id ?? detail.tid),
        hostuin,
        code_version: String(detail.code_version ?? 1),
        format: 'fs',
        qzreferrer: `https://user.qzone.qq.com/${hostuin}`,
    });
}

// 详情字段严格校验小件

export function detailObject(value: unknown, field: string): Record<string, unknown> {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`invalid qzone msg detail: ${field} must be an object`);
    }
    return value as Record<string, unknown>;
}

export function detailString(value: unknown, field: string): string {
    if (typeof value !== 'string') {
        throw new Error(`invalid qzone msg detail: ${field} must be a string`);
    }
    return value;
}

export function detailInteger(value: unknown, field: string, min = 0): number {
    const number = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
    if (typeof number !== 'number' || !Number.isSafeInteger(number) || number < min) {
        throw new Error(`invalid qzone msg detail: ${field} must be an integer >= ${min}`);
    }
    return number;
}

export function detailList(value: unknown, field: string): unknown[] {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value)) {
        throw new Error(`invalid qzone msg detail: ${field} must be an array`);
    }
    return value;
}

function mapQzoneComment(value: Record<string, unknown>, field: string): QzoneCommentReply {
    const id =
        typeof value['tid'] === 'number'
            ? String(detailInteger(value['tid'], `${field}.tid`))
            : detailString(value['tid'], `${field}.tid`);
    if (!id) {
        throw new Error(`invalid qzone msg detail: ${field}.tid is empty`);
    }
    return {
        comment_id: id,
        uin: detailInteger(value['uin'], `${field}.uin`, 1),
        name: detailString(value['name'], `${field}.name`),
        time: detailInteger(value['create_time'], `${field}.create_time`),
        content: detailString(value['content'], `${field}.content`),
    };
}

/**
 * 详情响应 → 规范化（含评论+内联回复）。结构坏数据不得伪装成成功的空页。
 * 对齐 SmartHypercube/Qzone-API 的 Comment / Emotion.load。
 */
export function mapQzoneMsgDetail(
    data: RawMsgDetailResponse,
    tid: string,
): QzoneMsgDetailResult {
    const resultTid = detailString(data.tid, 'tid');
    if (!resultTid || resultTid !== tid) {
        throw new Error('invalid qzone msg detail: tid does not match the requested post');
    }
    return {
        tid: resultTid,
        content: detailString(data.content, 'content'),
        comment_num: detailInteger(data.cmtnum, 'cmtnum'),
        comments: detailList(data.commentlist, 'commentlist').map((value, index) => {
            const field = `commentlist[${index}]`;
            const comment = detailObject(value, field);
            const mappedComment = mapQzoneComment(comment, field);
            return {
                ...mappedComment,
                replies: detailList(comment['list_3'], `${field}.list_3`).map((reply, replyIndex) => {
                    const replyField = `${field}.list_3[${replyIndex}]`;
                    return {
                        ...mapQzoneComment(detailObject(reply, replyField), replyField),
                        parent_comment_id: mappedComment.comment_id,
                        parent_comment_uin: mappedComment.uin,
                    };
                }),
            };
        }),
    };
}

/** 详情响应错误包络统一判定（code 或 subcode 任一非零即失败，subcode=0 不遮掩 code!=0）。 */
export function parseQzoneDetailError(data: RawMsgDetailResponse, tid: string): void {
    const code =
        data.code !== undefined && data.code !== 0 ? data.code : (data.subcode ?? data.code ?? -1);
    if (code !== 0) {
        throw new Error(
            `qzone msg detail failed: code=${code} ${data.message ?? data.msg ?? ''}`.trim(),
        );
    }
    void tid;
}

/** 解析 emotion_cgi_update（改权限）响应。 */
export function parseQzoneUpdateRightResponse(
    text: string,
    tid: string,
    right: number,
): QzoneUpdateRightResult {
    const data = parseQzoneJson<RawUpdateResponse>(text);
    if (typeof data.subcode === 'number' && data.subcode !== 0) {
        throw new Error(
            `qzone update right failed: subcode=${data.subcode} ${data.message ?? data.msg ?? ''}`.trim(),
        );
    }
    if (typeof data.code === 'number' && data.code !== 0) {
        throw new Error(
            `qzone update right failed: code=${data.code} ${data.message ?? data.msg ?? ''}`.trim(),
        );
    }
    void tid;
    return { ugc_right: Number(data.ugc_right ?? right) };
}

// ─────────────── 空间资料 ───────────────

interface RawQzoneProfileResponse {
    code?: number;
    subcode?: number;
    message?: string;
    data?: {
        spacename?: string;
        desc?: string;
    };
}

/** 构造空间资料 GET 查询（cgi_userinfo_get_all）。 */
export function buildQzoneProfileQuery(selfUin: string, targetUin: string, bkn: string): string {
    return new URLSearchParams({
        uin: targetUin,
        vuin: selfUin,
        fupdate: '1',
        rd: String(Math.random()),
        g_tk: bkn,
    }).toString();
}

/** 解析空间资料响应。 */
export function parseQzoneProfileResponse(text: string): QzoneProfile {
    const response = parseQzoneJson<RawQzoneProfileResponse>(text);
    if (response.code !== 0 || (response.subcode !== undefined && response.subcode !== 0)) {
        throw new Error(
            `qzone profile failed: code=${response.code} subcode=${response.subcode ?? 0} ${response.message ?? ''}`.trim(),
        );
    }
    if (typeof response.data?.spacename !== 'string' || typeof response.data.desc !== 'string') {
        throw new Error('invalid qzone profile response');
    }
    return { name: response.data.spacename, description: response.data.desc };
}

/** 构造空间资料修改表单体（字段位图 mb：spacename=2048, desc=4096）。 */
export function buildQzoneProfileUpdateBody(
    selfUin: string,
    profile: QzoneProfileUpdate,
): string {
    const params = new URLSearchParams({ uin: selfUin, pageindex: '3', fupdate: '1' });
    let bitmap = 0;
    // 空间设置表单用字段位图；独立富文本签名不含。
    // https://qzonestyle.gtimg.cn/qzone/v6/setting/profile/scripts/profile.js
    if (profile.name !== undefined) {
        params.set('spacename', profile.name.replaceAll('\r', ''));
        bitmap |= 2048;
    }
    if (profile.description !== undefined) {
        params.set('desc', profile.description.replaceAll('\r', ''));
        bitmap |= 4096;
    }
    params.set('mb', String(bitmap));
    return params.toString();
}

/** 解析空间资料修改响应。 */
export function parseQzoneProfileUpdateResponse(text: string): void {
    const response = parseQzoneJson<RawQzoneProfileResponse>(text);
    if (response.code !== 0 || (response.subcode !== undefined && response.subcode !== 0)) {
        throw new Error(
            `qzone profile update failed: code=${response.code} subcode=${response.subcode ?? 0} ${response.message ?? ''}`.trim(),
        );
    }
}
