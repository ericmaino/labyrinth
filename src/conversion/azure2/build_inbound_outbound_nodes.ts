import {NodeSpec, SimpleRoutingRuleSpec} from '../../graph';

import {
  AzureNetworkSecurityGroup,
  AzureReference,
  AzureTypedObject,
} from './azure_types';
import {NSGRuleSpecs} from './converters';
import {GraphServices} from './graph_services';

export function buildInboundOutboundNodes(
  services: GraphServices,
  spec: AzureTypedObject,
  routeBuilder: (parent: string) => SimpleRoutingRuleSpec[],
  nsgRef: AzureReference<AzureNetworkSecurityGroup> | undefined,
  parent: string,
  vnetSymbol: string,
  addressRange: string | undefined = undefined
): SimpleRoutingRuleSpec {
  const keyPrefix = services.ids.createKey(spec);

  //
  // NSG rules
  //
  let nsgRules: NSGRuleSpecs = {
    inboundRules: [],
    outboundRules: [],
  };

  if (nsgRef) {
    const nsgSpec = services.index.dereference<AzureNetworkSecurityGroup>(
      nsgRef
    );
    nsgRules = services.convert.nsg(nsgSpec, vnetSymbol);
  }

  // TODO: come up with safer naming scheme. Want to avoid collisions
  // with other names.
  const inboundKey = keyPrefix + '/inbound';

  // Only include an outbound node if there are outbound NSG rules.
  const outboundKey =
    nsgRules.outboundRules.length > 0 ? keyPrefix + '/outbound' : parent;

  const inboundRoutes = routeBuilder(outboundKey);

  //
  // Construct inbound node
  //
  const inboundNode: NodeSpec = {
    key: inboundKey,
    name: spec.id + '/inbound',
    filters: nsgRules.inboundRules,
    routes: inboundRoutes,
  };
  services.addNode(inboundNode);

  //
  // If there are outbound NSG rules, construct outbound node
  //
  if (nsgRules.outboundRules.length > 0) {
    const outboundNode: NodeSpec = {
      key: outboundKey,
      name: spec.id + '/outbound',
      filters: nsgRules.outboundRules,
      routes: [{destination: parent}],
    };
    services.addNode(outboundNode);
  }

  //
  // Return route for use by parent node.
  //
  const destinationIp = addressRange ?? gatherDestinationIps(inboundRoutes);
  return {
    destination: inboundKey,
    constraints: {destinationIp},
  };
}

function gatherDestinationIps(routes: SimpleRoutingRuleSpec[]) {
  const ips: string[] = [];
  for (const route of routes) {
    ips.push(route.constraints.destinationIp);
  }
  return ips.join(',');
}
