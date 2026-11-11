import { GrayTipElement, SnowCatCore } from 'snowcat-core';
import { NapCatOneBot11Adapter } from '@/snowcat-onebot/index';
import { OB11FriendPokeEvent } from '@/snowcat-onebot/event/notice/OB11PokeEvent';

export class OneBotFriendApi {
  obContext: NapCatOneBot11Adapter;
  core: SnowCatCore;
  constructor (obContext: NapCatOneBot11Adapter, core: SnowCatCore) {
    this.obContext = obContext;
    this.core = core;
  }

  // 使用前预先判断 busiId 1061
  async parsePrivatePokeEvent (grayTipElement: GrayTipElement, uin: number) {
    const json = JSON.parse(grayTipElement.jsonGrayTipElement.jsonStr);
    const pokedetail: Array<{ uid: string; }> = json.items;
    // 筛选item带有uid的元素
    const poke_uid = pokedetail.filter(item => item.uid);
    if (poke_uid.length === 2 && poke_uid[0]?.uid && poke_uid[1]?.uid) {
      return new OB11FriendPokeEvent(
        this.core,
        uin,
        parseInt((await this.core.apis.UserApi.getUinByUidV2(poke_uid[0].uid))),
        parseInt((await this.core.apis.UserApi.getUinByUidV2(poke_uid[1].uid))),
        pokedetail
      );
    }
    return undefined;
  }
}
