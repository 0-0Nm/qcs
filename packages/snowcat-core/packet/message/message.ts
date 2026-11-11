import { IPacketMsgElement } from '@/snowcat-core/packet/message/element';
import { SendMessageElement, SendMultiForwardMsgElement } from '@/snowcat-core/index';

export type PacketSendMsgElement = SendMessageElement | SendMultiForwardMsgElement;

export interface PacketMsg {
  seq?: number;
  clientSeq?: number;
  groupId?: number;
  senderUid: string;
  senderUin: number;
  senderName: string;
  time: number;
  msg: IPacketMsgElement<PacketSendMsgElement>[]
}
