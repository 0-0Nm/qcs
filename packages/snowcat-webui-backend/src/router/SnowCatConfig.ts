import { Router } from 'express';

import { SnowCatGetConfigHandler, SnowCatSetConfigHandler, SnowCatGetUinConfigHandler, SnowCatSetUinConfigHandler } from '@/snowcat-webui-backend/src/api/SnowCatConfig';

const router: Router = Router();

// router:获取 NapCat 配置（napcat.json 登录前配置）
router.get('/GetConfig', SnowCatGetConfigHandler);
// router:设置 NapCat 配置（napcat.json 登录前配置）
router.post('/SetConfig', SnowCatSetConfigHandler);
// router:获取 NapCat per-uin 配置（napcat_{uin}.json 登录后配置）
router.get('/GetUinConfig', SnowCatGetUinConfigHandler);
// router:设置 NapCat per-uin 配置（napcat_{uin}.json 登录后配置）
router.post('/SetUinConfig', SnowCatSetUinConfigHandler);

export { router as SnowCatConfigRouter };
