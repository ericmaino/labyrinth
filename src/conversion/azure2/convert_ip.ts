import {AzureGraphNode} from './azure_graph_node';
import {NodeKeyAndSourceIp} from './converters';
import {SubnetNode} from './convert_subnet';
import {GraphServices} from './graph_services';
import {AzureIPConfiguration, AzureObjectType} from './types';

const KEY_INTERNET = 'Internet';

export class IpNode extends AzureGraphNode<AzureIPConfiguration> {
  constructor(input: AzureIPConfiguration) {
    super(input.type as AzureObjectType, input);
  }

  *edges(): IterableIterator<string> {
    if (this.value.type === AzureObjectType.LOCAL_IP) {
      if (this.value.properties.subnet) {
        yield this.value.properties.subnet.id;
      }
    }
  }

  convert(services: GraphServices): NodeKeyAndSourceIp {
    return {key: this.nodeKey(), destinationIp: this.ipAddress()};
  }

  private ipAddress(): string {
    if (this.value.type === AzureObjectType.LOCAL_IP) {
      if (!this.value.properties.subnet) {
        throw new TypeError(
          `Local IP '${this.value.id}' is not bound to a subnet`
        );
      }

      return this.value.properties.privateIPAddress;
    } else {
      return this.value.properties.ipAddress;
    }
  }

  private nodeKey(): string {
    let key = KEY_INTERNET;

    if (this.value.type === AzureObjectType.LOCAL_IP) {
      key = `${this.subnet().value.id}/inbound`;
    }

    return key;
  }

  private subnet(): SubnetNode {
    return this.first<SubnetNode>(AzureObjectType.SUBNET);
  }
}
