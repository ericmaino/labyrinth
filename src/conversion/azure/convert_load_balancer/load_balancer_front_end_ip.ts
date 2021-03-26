import {frontEndIp1Id} from '../../../../test/conversion/azure/sample_resource_graph';
import {Graph, RoutingRuleSpec} from '../../../graph';

import {
  AzureLoadBalancerBackendPool,
  AzureLoadBalancerFrontEndIp,
  AzureLoadBalancerInboundNatRule,
  AzureLoadBalancerInboundRule,
  AzureLoadBalancerRule,
  AzurePrivateIP,
  AzurePublicIP,
} from '../azure_types';

import {GraphServices} from '../graph_services';

export function createLoadBalancerRoutes(
  services: GraphServices,
  spec: AzureLoadBalancerFrontEndIp,
  backboneKey: string
): RoutingRuleSpec[] {
  services.nodes.markTypeAsUsed(spec);

  const routes: RoutingRuleSpec[] = [];
  const inboundIp = getIp(services, spec);

  if (inboundIp) {
    for (const lbRuleRef of spec.properties.loadBalancingRules ?? []) {
      const lbRule = services.index.dereference<AzureLoadBalancerInboundRule>(
        lbRuleRef
      );
      services.nodes.markTypeAsUsed(lbRule);

      const backendPool = services.index.dereference<AzureLoadBalancerBackendPool>(
        lbRule.properties.backendAddressPool
      );
      services.nodes.markTypeAsUsed(backendPool);

      const backendIPs = backendPool.properties.backendIPConfigurations.map(
        ip =>
          services.index.dereference<AzurePrivateIP>(ip).properties
            .privateIPAddress
      );

      routes.push(
        createInboundRoute(lbRule, inboundIp, backboneKey, ...backendIPs)
      );
    }

    for (const natRuleSpec of spec.properties.inboundNatRules ?? []) {
      const natRule = services.index.dereference<AzureLoadBalancerInboundNatRule>(
        natRuleSpec
      );
      services.nodes.markTypeAsUsed(natRule);

      const backendIp = services.index.dereference<AzurePrivateIP>(
        natRule.properties.backendIPConfiguration
      );
      services.nodes.markTypeAsUsed(backendIp);

      routes.push(
        createInboundRoute(
          natRule,
          inboundIp,
          backboneKey,
          backendIp.properties.privateIPAddress
        )
      );
    }
  }
  return routes;
}

function getIp(
  services: GraphServices,
  spec: AzureLoadBalancerFrontEndIp
): string | undefined {
  let ip = spec.properties.privateIPAddress;

  if (!ip && spec.properties.publicIPAddress) {
    const publicIpSpec = services.index.dereference<AzurePublicIP>(
      spec.properties.publicIPAddress
    );
    ip = publicIpSpec.properties.ipAddress;
  }

  return ip;
}

function createInboundRoute(
  spec: AzureLoadBalancerRule,
  frontEndIp: string,
  subnetKey: string,
  ...backendIps: string[]
): RoutingRuleSpec {
  const rule = spec.properties;

  const ruleSpec: RoutingRuleSpec = {
    destination: subnetKey,
    constraints: {
      destinationIp: frontEndIp,
      destinationPort: rule.frontendPort.toString(),
      protocol: rule.protocol,
    },
    override: {
      destinationIp: backendIps.join(','),
    },
  };

  if (rule.backendPort !== rule.frontendPort) {
    ruleSpec.override!.destinationPort = rule.backendPort.toString();
  }

  return ruleSpec;
}
