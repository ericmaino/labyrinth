import DRange from 'drange';

import {formatIpLiteral, parseIp} from '../../dimensions';
import {RoutingRuleSpec} from '../../graph';

import {AzureGraphNode} from './azure_graph_node';
import {NodeKeyAndSourceIp} from './converters';
import {SubnetNode} from './convert_subnet';
import {GraphServices} from './graph_services';
import {AzureObjectType, AzureVirtualNetwork} from './types';

export class VirtualNetworkNode extends AzureGraphNode<AzureVirtualNetwork> {
  constructor(vnet: AzureVirtualNetwork) {
    super(AzureObjectType.VIRTUAL_NETWORK, vnet);
  }

  *edges(): IterableIterator<string> {
    for (const item of this.value.properties.subnets) {
      yield item.id;
    }
  }

  subnets(): IterableIterator<SubnetNode> {
    return this.typedEdges<SubnetNode>(AzureObjectType.SUBNET);
  }
}

export function convertVNet(
  services: GraphServices,
  node: VirtualNetworkNode
): NodeKeyAndSourceIp {
  // Our convention is to use the Azure id as the Labyrinth NodeSpec key.
  const vNetSpec = node.value;
  const vNetNodeKey = vNetSpec.id;
  const vNetServiceTag = vNetSpec.id;

  // Compute this VNet's address range by unioning up all of its address prefixes.
  const addressRange = new DRange();
  for (const address of vNetSpec.properties.addressSpace.addressPrefixes) {
    const ip = parseIp(address);
    addressRange.add(ip);
  }
  const sourceIp = formatIpLiteral(addressRange);
  services.symbols.defineServiceTag(vNetServiceTag, sourceIp);

  // Create outbound rule (traffic leaving vnet).
  const routes: RoutingRuleSpec[] = [
    {
      destination: services.getInternetKey(),
      constraints: {destinationIp: `except ${sourceIp}`},
    },
  ];

  const vnetDestinations: string[] = [];
  // Materialize subnets and create routes to each.
  for (const subnetNode of node.subnets()) {
    const {key: subnetNodeKey, destinationIp} = services.convert.subnet(
      services,
      subnetNode.value,
      vNetNodeKey
    );
    routes.push({
      destination: subnetNodeKey,
      constraints: {destinationIp},
    });
    vnetDestinations.push(destinationIp);
  }

  services.addNode({
    key: vNetNodeKey,
    range: {sourceIp},
    routes,
  });

  return {key: vNetNodeKey, destinationIp: vnetDestinations.join(',')};
}
