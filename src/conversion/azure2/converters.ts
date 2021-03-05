import {RuleSpec} from '../../rules';

import {convertNsg} from './convert_network_security_group';
import {VirtualNetworkNode} from './convert_vnet';
import {GraphServices} from './graph_services';

import {
  AzureIdReference,
  AzureLoadBalancer,
  AzureLoadBalancerBackendPool,
  AzureLoadBalancerFrontEndIp,
  AzureNetworkSecurityGroup,
  AzureResourceGraph,
  AzureSubnet,
} from './types';

export interface NodeKeyAndSourceIp {
  key: string;
  destinationIp: string;
}

export interface NSGRuleSpecs {
  readonly outboundRules: RuleSpec[];
  readonly inboundRules: RuleSpec[];
}

// DESIGN ALTERNATIVE (for converter return value):
// Instead of returning identifier that is both the node key and
// the service tag, return an object
//   {
//     inboundKey: string,
//     outboundKey: string,
//     range: DRange or string expression?
//   }
export interface IConverters {
  backendPool(
    services: GraphServices,
    spec: AzureLoadBalancerBackendPool
  ): NodeKeyAndSourceIp;
  resourceGraph(services: GraphServices, spec: AzureResourceGraph): void;
  subnet(
    services: GraphServices,
    spec: AzureSubnet,
    parent: string
  ): NodeKeyAndSourceIp;
  vnet(services: GraphServices, spec: VirtualNetworkNode): NodeKeyAndSourceIp;
  ip(services: GraphServices, spec: AzureIdReference): NodeKeyAndSourceIp;
  loadBalancerIp(
    services: GraphServices,
    spec: AzureLoadBalancerFrontEndIp
  ): NodeKeyAndSourceIp;
  loadBalancer(
    services: GraphServices,
    spec: AzureLoadBalancer
  ): NodeKeyAndSourceIp;
  nsg(
    services: GraphServices,
    spec: AzureNetworkSecurityGroup,
    vnetSymbol: string
  ): NSGRuleSpecs;
  vmssIp(
    services: GraphServices,
    ipConfigRef: AzureIdReference
  ): NodeKeyAndSourceIp;
}

export const defaultConverterMocks: IConverters = {
  resourceGraph: (services: GraphServices, spec: AzureResourceGraph) => {},
  subnet: (services: GraphServices, spec: AzureSubnet, vNetKey: string) =>
    // TODO: this is confusing. Returning vNetKey in destinationIp so that
    // unit tests can verify vNetKey.
    ({key: spec.id, destinationIp: `${vNetKey}`}),
  vnet: (services: GraphServices, spec: VirtualNetworkNode) => ({
    key: spec.key,
    destinationIp: 'xyz',
  }),
  ip: (services: GraphServices, spec: AzureIdReference) => ({
    key: spec.id,
    destinationIp: 'xyz',
  }),
  loadBalancerIp: (
    services: GraphServices,
    spec: AzureLoadBalancerFrontEndIp
  ) => ({
    key: spec.id,
    destinationIp: 'xyz',
  }),
  backendPool: (
    services: GraphServices,
    spec: AzureLoadBalancerBackendPool
  ) => ({
    key: spec.id,
    destinationIp: 'xyz',
  }),
  loadBalancer: (services: GraphServices, spec: AzureLoadBalancer) => ({
    key: spec.id,
    destinationIp: 'xyz',
  }),
  // TODO: nsg should be a mock.
  nsg: convertNsg,
  vmssIp: (
    services: GraphServices,
    ipConfigRef: AzureIdReference
  ): NodeKeyAndSourceIp => ({
    key: ipConfigRef.id,
    destinationIp: 'xyz',
  }),
};

export function overrideDefaultCoverterMocks(overrides: Partial<IConverters>) {
  return {...defaultConverterMocks, ...overrides};
}
