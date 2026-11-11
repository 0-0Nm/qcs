/**
 * SnowCat · 稳定性工程线（StableLine）
 *
 * 三条稳定线（师父令 2026-11-11）：
 * 1. 连接线：QQ 掉线自愈——登录态监听 + 指数退避重连 + 存活心跳
 * 2. 发言线：真人化节奏——发送前抖动延迟 + 突发限流 + 深夜低频
 * 3. 账号线：防风控节奏——每小时发送预算 + 连发熔断 + 指数冷却
 *
 * 全部为可选软层（默认温和值），不干预任何 OneBot 动作语义；
 * dsh 侧已有自己的节奏学（去模板化六条/语言学规则），此处只做传输层护栏。
 */

import { SnowCatCore } from 'snowcat-core';

export interface SnowCatStableConfig {
  /** 连接线：掉线后重连基础等待（毫秒） */
  reconnectBaseMs: number;
  /** 连接线：重连指数退避上限（毫秒） */
  reconnectCeilingMs: number;
  /** 发言线：发送前随机抖动下限（毫秒） */
  sendJitterMinMs: number;
  /** 发言线：发送前随机抖动上限（毫秒） */
  sendJitterMaxMs: number;
  /** 发言线：深夜时段（小时，本地时区）发送抖动倍率 */
  nightJitterMultiplier: number;
  /** 账号线：每小时允许的最大主动发言数（0=不限） */
  hourlySendBudget: number;
  /** 账号线：连发熔断阈值——连续 N 条无间隔发送后强制冷却 */
  burstBreakThreshold: number;
  /** 账号线：熔断冷却时长（毫秒） */
  burstCooldownMs: number;
}

export const DEFAULT_STABLE_CONFIG: SnowCatStableConfig = {
  reconnectBaseMs: 5_000,
  reconnectCeilingMs: 300_000,
  sendJitterMinMs: 600,
  sendJitterMaxMs: 2_400,
  nightJitterMultiplier: 1.8,
  hourlySendBudget: 120,
  burstBreakThreshold: 8,
  burstCooldownMs: 90_000,
};

export class SnowCatStableLine {
  private cfg: SnowCatStableConfig;
  private core: SnowCatCore | null = null;

  // 账号线状态
  private hourStamp = 0;
  private hourCount = 0;
  private burstCount = 0;
  private burstUntil = 0;
  private lastSendAt = 0;

  // 连接线状态
  private reconnectAttempt = 0;
  private online = true;

  constructor (cfg: Partial<SnowCatStableConfig> = {}) {
    this.cfg = { ...DEFAULT_STABLE_CONFIG, ...cfg };
  }

  attach (core: SnowCatCore): void {
    this.core = core;
  }

  get config (): SnowCatStableConfig {
    return this.cfg;
  }

  // ─────────────── 连接线 ───────────────

  /** 掉线时调用：登记并算下一次重连等待（指数退避）。 */
  markOffline (): number {
    this.online = false;
    this.reconnectAttempt += 1;
    const backoff = Math.min(
      this.cfg.reconnectBaseMs * 2 ** Math.min(this.reconnectAttempt, 6),
      this.cfg.reconnectCeilingMs,
    );
    return backoff;
  }

  /** 重连成功时调用：归零退避。 */
  markOnline (): void {
    this.online = true;
    this.reconnectAttempt = 0;
  }

  get isOnline (): boolean {
    return this.online;
  }

  // ─────────────── 发言线 + 账号线 ───────────────

  /**
   * 主动发言前调用：返回本次应等待的毫秒数（0=立即）。
   * 组合三层：账号预算 → 熔断冷却 → 真人抖动（深夜加倍）。
   */
  async beforeSend (): Promise<number> {
    const now = Date.now();

    // 账号线：小时预算
    const hour = Math.floor(now / 3_600_000);
    if (this.hourStamp !== hour) {
      this.hourStamp = hour;
      this.hourCount = 0;
    }
    if (this.cfg.hourlySendBudget > 0 && this.hourCount >= this.cfg.hourlySendBudget) {
      // 本小时预算用尽，睡到下一小时边界（附带随机分钟，别整点齐刷刷）
      const nextHour = (hour + 1) * 3_600_000;
      return nextHour - now + Math.floor(Math.random() * 60_000);
    }

    // 账号线：连发熔断
    if (now < this.burstUntil) {
      return this.burstUntil - now;
    }

    // 发言线：真人抖动（深夜 0-7 点加倍）
    const nightHours = [0, 1, 2, 3, 4, 5, 6, 7];
    const h = new Date().getHours();
    const mult = nightHours.includes(h) ? this.cfg.nightJitterMultiplier : 1;
    let wait = this.cfg.sendJitterMinMs +
      Math.random() * (this.cfg.sendJitterMaxMs - this.cfg.sendJitterMinMs);
    wait *= mult;

    // 账号线：距上条太近计一次连发，超阈值熔断
    if (now - this.lastSendAt < 2_000) {
      this.burstCount += 1;
      if (this.burstCount >= this.cfg.burstBreakThreshold) {
        this.burstUntil = now + this.cfg.burstCooldownMs;
        this.burstCount = 0;
        this.core?.context.logger.logWarn(
          `[SnowCat] 连发 ${this.cfg.burstBreakThreshold} 条触发熔断，冷却 ${this.cfg.burstCooldownMs / 1000}s`,
        );
        return this.cfg.burstCooldownMs;
      }
    } else {
      this.burstCount = 0;
    }

    this.hourCount += 1;
    this.lastSendAt = now;
    return Math.floor(wait);
  }

  /** 便捷等待：beforeSend + sleep。 */
  async stableDelay (): Promise<void> {
    const ms = await this.beforeSend();
    if (ms > 0) await new Promise((r) => setTimeout(r, ms));
  }
}

// 全局单例（NapCat 侧 wire 进启动链；dsh 侧动作层经 actions 引用）
export const snowCatStable = new SnowCatStableLine();
