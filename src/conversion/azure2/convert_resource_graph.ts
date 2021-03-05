import {NodeSpec, RoutingRuleSpec} from '../../graph';

import {GraphServices} from './graph_services';

///////////////////////////////////////////////////////////////////////////////
//
// convertResourceGraph() is responsible for
//   1. Creating the `Internet` node with routes to all public ips.
//   2. Materializing root nodes for VNets, NICs, and possibly compute pools.
//   3. Defining the `Internet` service tag, which is referenced by routing
//      and filtering rules in VNets and NSGs.
//
///////////////////////////////////////////////////////////////////////////////
export function convertResourceGraph(services: GraphServices) {
  // The Azure resource graph is considered to be a forest of AnyAzureObjects,
  // some of which are AzureVirtualNetworks.

  // Materialize each virtual network, while saving its NodeKey for later use.
  // Create routes from internet to each virtual network.
  const vNetNodeKeys: string[] = [];
  const routes: RoutingRuleSpec[] = [];

  const graph = services.index;

  for (const vnet of graph.virtualNetworks()) {
    // If the top-level item happens to be a VNet then materialize it.
    const {key, destinationIp} = vnet.convert(services);
    vNetNodeKeys.push(key);

    routes.push({
      destination: key,
      constraints: {destinationIp},
    });

    // TODO: Fix the conversion story.
    for (const lb of graph.loadBalancers()) {
      lb.convert(services);
    }
  }

  // const lb = asLoadBalancer(item);
  //   if (lb) {
  //     // If the top-level item happens to be a VNet then materialize it.
  //     const {key, destinationIp} = services.convert.loadBalancer(services, lb);
  //     routes.push({
  //       destination: key,
  //       constraints: {destinationIp},
  //     });
  //   }

  // Define a service tag for `Internet`, which is referenced in router rules
  // generated by converters like vNetConverter(). Azure defines `Internet` as
  // any ip addresses not in the ranges of the VNets.
  // See https://docs.microsoft.com/en-us/azure/virtual-network/service-tags-overview
  const sourceIp = `except ${vNetNodeKeys.join(',')}`;
  const internetNodeKey = services.getInternetKey();
  services.symbols.defineServiceTag(internetNodeKey, sourceIp);

  // TODO: the routes should really be the routes to all of the public ips, not the vnets.
  const internetNode: NodeSpec = {
    key: internetNodeKey,
    endpoint: true,
    range: {sourceIp},
    routes,
  };

  services.addNode(internetNode);
}
