import {PoolRuleSpec, RoutingRuleSpec} from '../../graph';

import {
  AzureLoadBalancer,
  AzureLoadBalancerRule,
  AzureLoadBalancerBackendPool,
  AzureLoadBalancerInboundNatRule,
  AzureLoadBalancerFrontEndIp,
} from './types';
import {GraphServices} from './graph_services';
import {NodeKeyAndSourceIp} from './converters';

// TODO: Move into constants
const AzureLoadBalancerSymbol = 'AzureLoadBalancer';

interface PoolRoute {
  frontEndIp: string;
  pool: RoutingRuleSpec[];
}

function creatLoadBalancerRulePool(
  lbRuleSpec: AzureLoadBalancerRule,
  services: GraphServices
): PoolRoute {
  const convert = services.convert;
  const store = services.index;
  const rule = lbRuleSpec.properties;
  const pool: RoutingRuleSpec[] = [];

  const {destinationIp: frontEndIp} = convert.loadBalancerIp(
    services,
    store.dereference(rule.frontendIPConfiguration)
  );

  const backEndPool: AzureLoadBalancerBackendPool = store.dereference(
    rule.backendAddressPool
  );

  for (const backendIpRef of backEndPool.properties.backendIPConfigurations) {
    const backendIp = services.convert.ip(services, backendIpRef);
    const ruleSpec: RoutingRuleSpec = {
      destination: backendIp.key,
      constraints: {
        destinationPort: `${rule.frontendPort}`,
        protocol: rule.protocol,
        destinationIp: frontEndIp,
      },
      override: {
        destinationIp: backendIp.destinationIp,
        sourceIp: AzureLoadBalancerSymbol,
      },
    };

    if (rule.backendPort !== rule.frontendPort) {
      ruleSpec.override!.destinationPort = `${rule.backendPort}`;
    }

    pool.push(ruleSpec);
  }

  return {frontEndIp, pool};
}

function createNATRoute(
  natRuleSpec: AzureLoadBalancerInboundNatRule,
  services: GraphServices
): RoutingRuleSpec | null {
  const convert = services.convert;
  const store = services.index;

  const rule = natRuleSpec.properties;

  const backEnd = convert.ip(services, rule.backendIPConfiguration);

  const {destinationIp: frontEndIp} = convert.loadBalancerIp(
    services,
    store.dereference(rule.frontendIPConfiguration)
  );

  const ruleSpec: RoutingRuleSpec = {
    destination: backEnd.key,
    constraints: {
      destinationPort: `${rule.frontendPort}`,
      protocol: rule.protocol,
      destinationIp: frontEndIp,
    },
    override: {
      destinationIp: backEnd.destinationIp,
      sourceIp: AzureLoadBalancerSymbol,
    },
  };

  if (rule.backendPort !== rule.frontendPort) {
    ruleSpec.override!.destinationPort = `${rule.backendPort}`;
  }

  return ruleSpec;
}

export function convertLoadBalancer(
  services: GraphServices,
  loadBalancerSpec: AzureLoadBalancer
): NodeKeyAndSourceIp {
  const loadBalancerNodeKey = loadBalancerSpec.id;
  const loadBalancerServiceTag = loadBalancerSpec.id;

  const routes: RoutingRuleSpec[] = [];
  const frontEndIps = new Set<string>();

  for (const lbRuleSpec of loadBalancerSpec.properties.loadBalancingRules) {
    const rule = creatLoadBalancerRulePool(lbRuleSpec, services);
    routes.push(...rule.pool);
    frontEndIps.add(rule.frontEndIp);
  }

  for (const natRuleSpec of loadBalancerSpec.properties.inboundNatRules) {
    const route = createNATRoute(natRuleSpec, services);
    if (route) {
      routes.push(route);
      if (route?.constraints?.destinationIp) {
        frontEndIps.add(route.constraints.destinationIp);
      }
    }
  }

  services.symbols.defineServiceTag(
    loadBalancerServiceTag,
    [...frontEndIps.values()].join(',')
  );

  services.addNode({
    key: loadBalancerNodeKey,
    routes,
  });

  return {key: loadBalancerNodeKey, destinationIp: loadBalancerServiceTag};
}

export function convertLoadBalancerIp(
  services: GraphServices,
  loadBalancerIpSpec: AzureLoadBalancerFrontEndIp
): NodeKeyAndSourceIp {
  const ipConfigSpec = services.index.dereference(
    loadBalancerIpSpec.properties.publicIPAddress
  );
  return services.convert.ip(services, ipConfigSpec);
}

export function convertBackendPool(
  services: GraphServices,
  backendPoolSpec: AzureLoadBalancerBackendPool
): NodeKeyAndSourceIp {
  const poolServiceTag = backendPoolSpec.id;
  const poolIpRange = new Set<string>();
  let poolSubnetKey = '';

  for (const backendIp of backendPoolSpec.properties.backendIPConfigurations) {
    const ip = services.convert.ip(services, backendIp);
    poolIpRange.add(ip.destinationIp);

    if (poolSubnetKey !== '' && poolSubnetKey !== ip.key) {
      throw new TypeError(
        'Invalid assumption. Pools should not be allowed to cross subnets'
      );
    }

    poolSubnetKey = ip.key;
  }

  services.symbols.defineServiceTag(
    poolServiceTag,
    [...poolIpRange.values()].join(',')
  );

  return {key: poolSubnetKey, destinationIp: poolServiceTag};
}
