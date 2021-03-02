import DRange from 'drange';

import {formatIpLiteral, parseIp} from '../../dimensions';
import {RoutingRuleSpec} from '../../graph';

import {GraphServices} from './graph_services';
import {AzureVirtualNetwork} from './types';

export function convertVNet(
  services: GraphServices,
  vNetSpec: AzureVirtualNetwork
): string {
  // Our convention is to use the Azure id as the Labyrinth NodeSpec key.
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

  // Materialize subnets and create routes to each.
  for (const subnetSpec of vNetSpec.properties.subnets) {
    const subnetNodeKey = services.convert.subnet(
      services,
      subnetSpec,
      vNetNodeKey
    );
    routes.push({
      destination: subnetNodeKey,
      constraints: {destinationIp: subnetNodeKey},
    });
  }

  services.addNode({
    key: vNetNodeKey,
    range: {sourceIp},
    routes,
  });

  return vNetNodeKey;
}