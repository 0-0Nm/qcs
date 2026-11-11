import { OB11BaseMetaEvent } from './OB11BaseMetaEvent';
import { SnowCatCore } from 'snowcat-core';

interface HeartbeatStatus {
  online: boolean | undefined,
  good: boolean
}

export class OB11HeartbeatEvent extends OB11BaseMetaEvent {
  meta_event_type = 'heartbeat';
  status: HeartbeatStatus;
  interval: number;

  public constructor (core: SnowCatCore, interval: number, isOnline: boolean, isGood: boolean) {
    super(core);
    this.interval = interval;
    this.status = {
      online: isOnline,
      good: isGood,
    };
  }
}
