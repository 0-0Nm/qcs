import { Router } from 'express';
import { GetThemeConfigHandler, GetNapCatVersion, QQVersionHandler, SetThemeConfigHandler, getLatestTagHandler, getAllReleasesHandler, GetMirrorsHandler, GetNapCatFileHashHandler } from '../api/BaseInfo';
import { StatusRealTimeHandler } from '@/snowcat-webui-backend/src/api/Status';
import { GetProxyHandler } from '../api/Proxy';

const router: Router = Router();
// router: 获取nc的package.json信息
router.get('/QQVersion', QQVersionHandler);

// 品牌命名统一为 SnowCat：新路径优先，旧 NapCat 路径保留兼容（老前端 / 外部脚本）
router.get('/GetSnowCatVersion', GetNapCatVersion);
router.get('/GetNapCatVersion', GetNapCatVersion);

router.get('/getLatestTag', getLatestTagHandler);
router.get('/getAllReleases', getAllReleasesHandler);
router.get('/getMirrors', GetMirrorsHandler);
router.get('/GetSysStatusRealTime', StatusRealTimeHandler);
router.get('/proxy', GetProxyHandler);
router.get('/Theme', GetThemeConfigHandler);
router.post('/SetTheme', SetThemeConfigHandler);

router.get('/GetSnowCatFileHash', GetNapCatFileHashHandler);
router.get('/GetNapCatFileHash', GetNapCatFileHashHandler);

export { router as BaseRouter };
