import {RoutingRuleSpec, SimpleRoutingRuleSpec} from '../../../graph';

import {AzureLoadBalancer} from '../azure_types';
import {GraphServices} from '../graph_services';
import {createLoadBalancerRoutes} from './load_balancer_front_end_ip';

export function convertLoadBalancer(
  services: GraphServices,
  spec: AzureLoadBalancer,
  vnetNodeKey: string
): SimpleRoutingRuleSpec | undefined {
  const loadBalancerKey = services.nodes.createKey(spec);
  const lbRoutes: RoutingRuleSpec[] = [];
  const ips: string[] = [];
  services.nodes.markTypeAsUsed(spec);

  for (const frontendSpec of spec.properties.frontendIPConfigurations) {
    if (frontendSpec.properties.privateIPAddress) {
      const ip = frontendSpec.properties.privateIPAddress;
      ips.push(ip);
    }

    const routes = createLoadBalancerRoutes(
      services,
      frontendSpec,
      vnetNodeKey
    );

    if (routes) {
      lbRoutes.push(...routes);
    }
  }

  services.nodes.add({
    key: loadBalancerKey,
    routes: lbRoutes,
  });

  if (ips.length > 0) {
    return {
      destination: loadBalancerKey,
      constraints: {
        destinationIp: ips.join(','),
      },
    };
  }

  return undefined;
}

export function isInternalLoadBalancer(spec: AzureLoadBalancer): boolean {
  const ipConfig = spec.properties.frontendIPConfigurations[0];
  return (ipConfig && ipConfig.properties.privateIPAddress) !== undefined;
}
