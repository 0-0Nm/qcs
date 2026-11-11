import { OB11EmitEventContent, OB11NetworkReloadType } from './index';
import express, { Express, Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import { McpServerConfig } from '@/snowcat-onebot/config/config';
import { IOB11NetworkAdapter } from '@/snowcat-onebot/network/adapter';
import { ActionName } from '@/snowcat-onebot/action/router';
import { OneBotAction } from '@/snowcat-onebot/action/OneBotAction';

/**
 * SnowCat MCP 服务器适配器
 *
 * 把 OneBot v11 全部动作以 MCP（Model Context Protocol）工具形式暴露，
 * AI 宿主（Claude / dsh / 任何 MCP 客户端）直连调用。
 *
 * 传输：Streamable HTTP（POST /mcp 单次 JSON-RPC；GET /mcp 返回 SSE 事件流）。
 * 鉴权：Bearer token（与网络配置 token 一致；为空则不鉴权）。
 */
export class OB11McpServerAdapter extends IOB11NetworkAdapter<McpServerConfig> {
  private app: Express | undefined;
  private server: http.Server | undefined;
  private sseClients: Response[] = [];

  override get isActive (): boolean {
    return this.isEnable;
  }

  override async onEvent<T extends OB11EmitEventContent> (event: T) {
    // MCP 侧事件推给已建立 SSE 流的客户端（notifications 可选通道）
    const payload = `event: ob11_event\ndata: ${JSON.stringify(event)}\n\n`;
    const promises = this.sseClients.map((res) => new Promise<void>((resolve) => {
      res.write(payload, () => resolve());
    }));
    await Promise.allSettled(promises);
  }

  open () {
    try {
      if (this.isEnable) {
        this.core.context.logger.logError('Cannot open a closed MCP server');
        return;
      }
      this.initializeServer();
      this.isEnable = true;
    } catch (e) {
      this.core.context.logger.logError(`[OneBot] [MCP Server Adapter] Boot Error: ${e}`);
    }
  }

  async close () {
    this.isEnable = false;
    this.sseClients.forEach((res) => res.end());
    this.sseClients = [];
    this.server?.close();
    this.app = undefined;
  }

  async reload (newConfig: McpServerConfig) {
    const wasEnabled = this.isEnable;
    const oldPort = this.config.port;
    const oldHost = this.config.host;
    const oldToken = this.config.token;
    this.config = newConfig;

    if (newConfig.enable && !wasEnabled) {
      this.open();
      return OB11NetworkReloadType.NetWorkOpen;
    } else if (!newConfig.enable && wasEnabled) {
      await this.close();
      return OB11NetworkReloadType.NetWorkClose;
    }
    if (oldPort !== newConfig.port || oldHost !== newConfig.host || oldToken !== newConfig.token) {
      await this.close();
      if (newConfig.enable) {
        this.open();
        return OB11NetworkReloadType.NetWorkOpen;
      }
      return OB11NetworkReloadType.NetWorkClose;
    }
    return OB11NetworkReloadType.Normal;
  }

  private authOk (req: Request): boolean {
    const token = this.config.token;
    if (!token) return true;
    const auth = req.headers.authorization ?? '';
    return auth === `Bearer ${token}`;
  }

  private jsonRpcError (res: Response, id: unknown, code: number, message: string) {
    res.json({ jsonrpc: '2.0', id, error: { code, message } });
  }

  private toolNameFor (actionName: string): string {
    // action 名已是 PascalCase（如 SendGroupMsg），MCP 工具名转 snake_case 更顺手
    return actionName.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
  }

  private initializeServer () {
    this.app = express();
    this.server = http.createServer(this.app);
    this.app.use(cors());
    this.app.use(express.json({ limit: '50mb' }));

    // 鉴权
    this.app.use((req, res, next) => {
      if (!this.authOk(req)) {
        res.status(401).json({ jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Unauthorized' } });
        return;
      }
      next();
    });

    // GET /mcp → SSE 事件流（可选）
    this.app.get('/mcp', (req, res) => {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();
      res.write(': stream open\n\n');
      this.sseClients.push(res);
      req.on('close', () => {
        this.sseClients = this.sseClients.filter((c) => c !== res);
      });
    });

    // POST /mcp → JSON-RPC
    this.app.post('/mcp', async (req, res) => {
      const body = req.body ?? {};
      const { id, method, params } = body as { id?: unknown; method?: string; params?: Record<string, unknown> };
      try {
        switch (method) {
          case 'initialize':
            res.json({
              jsonrpc: '2.0',
              id,
              result: {
                protocolVersion: '2025-03-26',
                capabilities: { tools: { listChanged: false } },
                serverInfo: { name: 'snowcat-onebot', version: '1.0.0' },
              },
            });
            return;
          case 'notifications/initialized':
            res.status(202).end();
            return;
          case 'ping':
            res.json({ jsonrpc: '2.0', id, result: {} });
            return;
          case 'tools/list': {
            const tools = (Object.values(ActionName) as string[]).filter(n => n !== ActionName.Unknown).map((name) => {
              const action = this.actions.get(name as never) as OneBotAction<unknown, unknown> | undefined;
              if (!action) return null;
              return {
                name: this.toolNameFor(name),
                description: `[OneBot:${name}] ${action.actionDescription || name}`,
                inputSchema: this.actionInputSchema(action),
              };
            }).filter(Boolean);
            res.json({ jsonrpc: '2.0', id, result: { tools } });
            return;
          }
          case 'tools/call': {
            const toolName = String(params?.['name'] ?? '');
            const args = (params?.['arguments'] ?? {}) as Record<string, unknown>;
            // 工具名反查动作名（snake_case → PascalCase）
            const pascal = toolName.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
            const actionName = (ActionName as Record<string, string>)[pascal] ?? pascal;
            const action = this.actions.get(actionName as never) as OneBotAction<unknown, unknown> | undefined;
            if (!action) {
              this.jsonRpcError(res, id, -32602, `Unknown tool: ${toolName}`);
              return;
            }
            const result = await action.handle(args, this.name, this.config, { send: async () => {} });
            // OB11Return: { status, retcode, data, message, ... } → MCP content
            const ret = result as { data?: unknown; message?: string; retcode?: number };
            const ok = ret.retcode === 0;
            res.json({
              jsonrpc: '2.0',
              id,
              result: {
                content: [{ type: 'text', text: JSON.stringify(ret.data ?? ret, null, 2) }],
                isError: !ok,
              },
            });
            return;
          }
          case 'resources/list':
            res.json({ jsonrpc: '2.0', id, result: { resources: [] } });
            return;
          case 'prompts/list':
            res.json({ jsonrpc: '2.0', id, result: { prompts: [] } });
            return;
          default:
            this.jsonRpcError(res, id, -32601, `Method not found: ${method}`);
        }
      } catch (e) {
        this.core.context.logger.logError(`[OneBot] [MCP] handler error: ${e}`);
        this.jsonRpcError(res, id, -32603, `Internal error: ${(e as Error).message}`);
      }
    });

    this.server.listen(this.config.port, this.config.host, () => {
      this.core.context.logger.log(`[OneBot] [MCP Server] SnowCat MCP 已启动: http://${this.config.host}:${this.config.port}/mcp（OneBot v11 全量动作）`);
    });
  }

  private actionInputSchema (action: OneBotAction<unknown, unknown>): Record<string, unknown> {
    // 有 typebox payloadSchema 的动作直接透传 JSON Schema；没有的收任意对象
    const ps = action.payloadSchema as unknown as Record<string, unknown> | undefined;
    if (ps && typeof ps === 'object' && ps['type'] === 'object') {
      return ps;
    }
    return { type: 'object', properties: {}, additionalProperties: true };
  }
}
