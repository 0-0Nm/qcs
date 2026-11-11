import { PacketHighwayContext } from '@/snowcat-core/packet/highway/highwayContext';
import { SnowCatCore } from '@/snowcat-core/index';
import { PacketLogger } from '@/snowcat-core/packet/context/loggerContext';
import { NapCoreContext } from '@/snowcat-core/packet/context/napCoreContext';
import { PacketClientContext } from '@/snowcat-core/packet/context/clientContext';
import { PacketOperationContext } from '@/snowcat-core/packet/context/operationContext';
import { PacketMsgConverter } from '@/snowcat-core/packet/message/converter';

export class PacketContext {
  readonly msgConverter: PacketMsgConverter;
  readonly napcore: NapCoreContext;
  readonly logger: PacketLogger;
  readonly client: PacketClientContext;
  readonly highway: PacketHighwayContext;
  readonly operation: PacketOperationContext;

  constructor (core: SnowCatCore) {
    this.msgConverter = new PacketMsgConverter();
    this.napcore = new NapCoreContext(core);
    this.logger = new PacketLogger(this.napcore);
    this.client = new PacketClientContext(this.napcore, this.logger, this.napcore.napi2nativeLoader);
    this.highway = new PacketHighwayContext(this.napcore, this.logger, this.client);
    this.operation = new PacketOperationContext(this);
  }
}
