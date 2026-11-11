/**
 * @file 所有路由的入口文件
 */

import { Router } from 'express';

import { OB11ConfigRouter } from '@/snowcat-webui-backend/src/router/OB11Config';
import { auth } from '@/snowcat-webui-backend/src/middleware/auth';
import { sendSuccess } from '@/snowcat-webui-backend/src/utils/response';

import { QQLoginRouter } from '@/snowcat-webui-backend/src/router/QQLogin';
import { AuthRouter } from '@/snowcat-webui-backend/src/router/auth';
import { LogRouter } from '@/snowcat-webui-backend/src/router/Log';
import { BaseRouter } from '@/snowcat-webui-backend/src/router/Base';
import { FileRouter } from './File';
import { WebUIConfigRouter } from './WebUIConfig';
import { UpdateNapCatRouter } from './UpdateNapCat';
import DebugRouter from '@/snowcat-webui-backend/src/api/Debug';
import { ProcessRouter } from './Process';
import { PluginRouter } from './Plugin';
import { MirrorRouter } from './Mirror';
import { SnowCatConfigRouter } from './SnowCatConfig';

const router: Router = Router();

// 鉴权中间件
router.use(auth);

// router:测试用
router.all('/test', (_, res) => {
  return sendSuccess(res);
});
// router:基础信息相关路由
router.use('/base', BaseRouter);
// router:WebUI登录相关路由
router.use('/auth', AuthRouter);
// router:QQ登录相关路由
router.use('/QQLogin', QQLoginRouter);
// router:OB11配置相关路由
router.use('/OB11Config', OB11ConfigRouter);
// router:日志相关路由
router.use('/Log', LogRouter);
// file:文件相关路由
router.use('/File', FileRouter);
// router:WebUI配置相关路由
router.use('/WebUIConfig', WebUIConfigRouter);
// router:更新相关路由
// 品牌命名统一为 SnowCat：新路径优先，旧 NapCat 路径保留兼容
router.use('/UpdateSnowCat', UpdateNapCatRouter);
router.use('/UpdateNapCat', UpdateNapCatRouter);
// router:调试相关路由
router.use('/Debug', DebugRouter);
// router:进程管理相关路由
router.use('/Process', ProcessRouter);
// router:插件管理相关路由
router.use('/Plugin', PluginRouter);
// router:镜像管理相关路由
router.use('/Mirror', MirrorRouter);
// router:NapCat配置相关路由
router.use('/SnowCatConfig', SnowCatConfigRouter);

export { router as ALLRouter };
