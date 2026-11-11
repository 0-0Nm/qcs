import { EventType, OneBotEvent } from '@/snowcat-onebot/event/OneBotEvent';

export abstract class OB11BaseMessageEvent extends OneBotEvent {
  post_type = EventType.MESSAGE;
}
