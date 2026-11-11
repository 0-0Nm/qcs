import store from 'snowcat-common/src/store';
import { snowCatVersion } from 'snowcat-common/src/version';
import { SnowCatCoreWorkingEnv, type LoginRuntimeType, type QQLoginPhase } from '../types';

const LoginRuntime: LoginRuntimeType = {
  workingEnv: SnowCatCoreWorkingEnv.Unknown,
  LoginCurrentTime: Date.now(),
  LoginCurrentRate: 0,
  QQLoginStatus: false, // 已实现 但太傻了 得去那边注册个回调刷新
  QQLoginPhase: 'waiting_qrcode',
  QQQRCodeURL: '',
  QQLoginUin: '',
  QQLoginInfo: {
    uid: '',
    uin: '',
    nick: '',
  },
  QQLoginError: '',
  QQVersion: 'unknown',
  QQDataPath: '',
  OneBotContext: null,
  onQQLoginStatusChange: async (status: boolean) => {
    LoginRuntime.QQLoginStatus = status;
  },
  onWebUiTokenChange: async (_token: string) => {

  },
  onRefreshQRCode: async () => {
    // 默认空实现，由 shell 注册真实回调
  },
  SnowCatHelper: {
    onOB11ConfigChanged: async () => {

    },
    onQuickLoginRequested: async () => {
      return { result: false, message: '' };
    },
    onPasswordLoginRequested: async () => {
      return { result: false, message: '密码登录功能未初始化' };
    },
    onCaptchaLoginRequested: async () => {
      return { result: false, message: '验证码登录功能未初始化' };
    },
    onNewDeviceLoginRequested: async () => {
      return { result: false, message: '新设备登录功能未初始化' };
    },
    onRestartProcessRequested: async () => {
      return { result: false, message: '重启功能未初始化' };
    },
    QQLoginList: [],
    NewQQLoginList: [],
  },
  SnowCatVersion: snowCatVersion,
  WebUiConfigQuickFunction: async () => {

  },
};
export const WebUiDataRuntime = {
  setWorkingEnv (env: SnowCatCoreWorkingEnv): void {
    LoginRuntime.workingEnv = env;
  },
  getWorkingEnv (): SnowCatCoreWorkingEnv {
    return LoginRuntime.workingEnv;
  },
  setWebUiTokenChangeCallback (func: (token: string) => Promise<void>): void {
    LoginRuntime.onWebUiTokenChange = func;
  },
  getWebUiTokenChangeCallback (): (token: string) => Promise<void> {
    return LoginRuntime.onWebUiTokenChange;
  },
  checkLoginRate (ip: string, RateLimit: number): boolean {
    const key = `login_rate:${ip}`;
    const count = store.get<number>(key) || 0;

    if (count === 0) {
      // 第一次访问，设置计数器为1，并设置60秒过期
      store.set(key, 1, 60);
      return true;
    }

    if (count >= RateLimit) {
      return false;
    }

    store.set(key, count + 1);
    return true;
  },

  getQQLoginStatus (): LoginRuntimeType['QQLoginStatus'] {
    return LoginRuntime.QQLoginStatus;
  },

  setQQLoginCallback (func: (status: boolean) => Promise<void>): void {
    LoginRuntime.onQQLoginStatusChange = func;
  },

  getQQLoginCallback (): (status: boolean) => Promise<void> {
    return LoginRuntime.onQQLoginStatusChange;
  },

  setQQLoginStatus (status: LoginRuntimeType['QQLoginStatus']): void {
    LoginRuntime.QQLoginStatus = status;
  },

  setQQLoginPhase (phase: QQLoginPhase): void {
    LoginRuntime.QQLoginPhase = phase;
  },

  getQQLoginPhase (): QQLoginPhase {
    return LoginRuntime.QQLoginPhase;
  },

  setQQLoginQrcodeURL (url: LoginRuntimeType['QQQRCodeURL']): void {
    LoginRuntime.QQQRCodeURL = url;
  },

  getQQLoginQrcodeURL (): LoginRuntimeType['QQQRCodeURL'] {
    return LoginRuntime.QQQRCodeURL;
  },

  setQQLoginInfo (info: LoginRuntimeType['QQLoginInfo']): void {
    LoginRuntime.QQLoginInfo = info;
    LoginRuntime.QQLoginUin = info.uin.toString();
  },

  getQQLoginInfo (): LoginRuntimeType['QQLoginInfo'] {
    return LoginRuntime.QQLoginInfo;
  },

  getQQLoginUin (): LoginRuntimeType['QQLoginUin'] {
    return LoginRuntime.QQLoginUin;
  },

  getQQQuickLoginList (): LoginRuntimeType['SnowCatHelper']['QQLoginList'] {
    return LoginRuntime.SnowCatHelper.QQLoginList;
  },

  setQQQuickLoginList (list: LoginRuntimeType['SnowCatHelper']['QQLoginList']): void {
    LoginRuntime.SnowCatHelper.QQLoginList = list;
  },

  getQQNewLoginList (): LoginRuntimeType['SnowCatHelper']['NewQQLoginList'] {
    return LoginRuntime.SnowCatHelper.NewQQLoginList;
  },

  setQQNewLoginList (list: LoginRuntimeType['SnowCatHelper']['NewQQLoginList']): void {
    LoginRuntime.SnowCatHelper.NewQQLoginList = list;
  },

  setQuickLoginCall (func: LoginRuntimeType['SnowCatHelper']['onQuickLoginRequested']): void {
    LoginRuntime.SnowCatHelper.onQuickLoginRequested = func;
  },

  requestQuickLogin: function (uin) {
    return LoginRuntime.SnowCatHelper.onQuickLoginRequested(uin);
  } as LoginRuntimeType['SnowCatHelper']['onQuickLoginRequested'],

  setPasswordLoginCall (func: LoginRuntimeType['SnowCatHelper']['onPasswordLoginRequested']): void {
    LoginRuntime.SnowCatHelper.onPasswordLoginRequested = func;
  },

  requestPasswordLogin: function (uin: string, passwordMd5: string) {
    return LoginRuntime.SnowCatHelper.onPasswordLoginRequested(uin, passwordMd5);
  } as LoginRuntimeType['SnowCatHelper']['onPasswordLoginRequested'],

  setCaptchaLoginCall (func: LoginRuntimeType['SnowCatHelper']['onCaptchaLoginRequested']): void {
    LoginRuntime.SnowCatHelper.onCaptchaLoginRequested = func;
  },

  requestCaptchaLogin: function (uin: string, passwordMd5: string, ticket: string, randstr: string, sid: string) {
    return LoginRuntime.SnowCatHelper.onCaptchaLoginRequested(uin, passwordMd5, ticket, randstr, sid);
  } as LoginRuntimeType['SnowCatHelper']['onCaptchaLoginRequested'],

  setNewDeviceLoginCall (func: LoginRuntimeType['SnowCatHelper']['onNewDeviceLoginRequested']): void {
    LoginRuntime.SnowCatHelper.onNewDeviceLoginRequested = func;
  },

  requestNewDeviceLogin: function (uin: string, passwordMd5: string, newDevicePullQrCodeSig: string) {
    return LoginRuntime.SnowCatHelper.onNewDeviceLoginRequested(uin, passwordMd5, newDevicePullQrCodeSig);
  } as LoginRuntimeType['SnowCatHelper']['onNewDeviceLoginRequested'],

  setOnOB11ConfigChanged (func: LoginRuntimeType['SnowCatHelper']['onOB11ConfigChanged']): void {
    LoginRuntime.SnowCatHelper.onOB11ConfigChanged = func;
  },

  setOB11Config: function (ob11) {
    return LoginRuntime.SnowCatHelper.onOB11ConfigChanged(ob11);
  } as LoginRuntimeType['SnowCatHelper']['onOB11ConfigChanged'],

  GetNapCatVersion () {
    return LoginRuntime.SnowCatVersion;
  },

  setQQVersion (version: string) {
    LoginRuntime.QQVersion = version;
  },

  getQQVersion () {
    return LoginRuntime.QQVersion;
  },

  setQQDataPath (dataPath: string) {
    LoginRuntime.QQDataPath = dataPath;
  },

  getQQDataPath (): string {
    return LoginRuntime.QQDataPath;
  },

  setWebUiConfigQuickFunction (func: LoginRuntimeType['WebUiConfigQuickFunction']): void {
    LoginRuntime.WebUiConfigQuickFunction = func;
  },
  runWebUiConfigQuickFunction: async function () {
    await LoginRuntime.WebUiConfigQuickFunction();
  },

  setOneBotContext (context: any): void {
    LoginRuntime.OneBotContext = context;
  },

  getOneBotContext (): any | null {
    return LoginRuntime.OneBotContext;
  },

  setRestartProcessCall (func: () => Promise<{ result: boolean; message: string; }>): void {
    LoginRuntime.SnowCatHelper.onRestartProcessRequested = func;
  },

  requestRestartProcess: async function () {
    return await LoginRuntime.SnowCatHelper.onRestartProcessRequested();
  },

  setQQLoginError (error: string): void {
    LoginRuntime.QQLoginError = error;
  },

  getQQLoginError (): string {
    return LoginRuntime.QQLoginError;
  },

  setRefreshQRCodeCallback (func: () => Promise<void>): void {
    LoginRuntime.onRefreshQRCode = func;
  },

  getRefreshQRCodeCallback (): () => Promise<void> {
    return LoginRuntime.onRefreshQRCode;
  },

  refreshQRCode: async function () {
    const previousQRCodeUrl = LoginRuntime.QQQRCodeURL;
    LoginRuntime.QQLoginError = '';
    LoginRuntime.QQLoginPhase = 'generating_qrcode';
    await LoginRuntime.onRefreshQRCode();

    const refreshTimeout = 10_000;
    const deadline = Date.now() + refreshTimeout;
    while (Date.now() < deadline) {
      const qrcodeUrl = LoginRuntime.QQQRCodeURL;
      if (qrcodeUrl && qrcodeUrl !== previousQRCodeUrl) {
        LoginRuntime.QQLoginPhase = 'waiting_qrcode';
        return qrcodeUrl;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    LoginRuntime.QQLoginPhase = previousQRCodeUrl ? 'waiting_qrcode' : 'offline';
    throw new Error('二维码刷新超时：QQ 登录服务未返回新的二维码');
  },
};
