import {NodeSpec, SimpleRoutingRuleSpec} from '../../graph';

import {
  AzureNetworkInterface,
  AzureNetworkSecurityGroup,
  AzureVirtualMachine,
} from './azure_types';

import {NSGRuleSpecs} from './converters';
import {GraphServices} from './graph_services';

// TODO: Verify that all IpConfigs have same subnet

export function convertNIC(
  services: GraphServices,
  spec: AzureNetworkInterface,
  parent: string,
  vnetSymbol: string
): SimpleRoutingRuleSpec {
  if (!spec.properties.virtualMachine) {
    // The NIC is not attached to a VM which means that it is not active
    // and cannot be routed to. In this case no NIC should be added
    throw new TypeError('NIC without VM are not supported');
  }

  const keyPrefix = services.ids.createKey(spec);

  //
  // NSG rules
  //
  const nsgRef = spec.properties.networkSecurityGroup;
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

  // Create the route to the VM.
  const vmSpec = services.index.dereference<AzureVirtualMachine>(
    spec.properties.virtualMachine
  );
  const vmRoute = services.convert.vm(services, vmSpec, outboundKey);

  //
  // Construct inbound node
  //
  const inboundNode: NodeSpec = {
    key: inboundKey,
    name: spec.id + '/inbound',
    routes: [vmRoute],
  };
  if (nsgRules.inboundRules.length) {
    inboundNode.filters = nsgRules.inboundRules;
  }
  services.addNode(inboundNode);

  //
  // If there are outbound NSG rules, construct outbound node
  //
  if (nsgRules.outboundRules.length > 0) {
    const outboundNode: NodeSpec = {
      key: outboundKey,
      name: spec.id + '/outbound',
      routes: [{destination: parent}],
    };
    if (nsgRules.outboundRules.length) {
      outboundNode.filters = nsgRules.outboundRules;
    }
    services.addNode(outboundNode);
  }

  //
  // Return route for use by parent node.
  //

  // DESIGN NOTE: it appears that Azure does not allow a NIC to include
  // IpConfigs bound to multiple subnets. If this assumption were wrong,
  // we would have to filter this map to include only private IPs for the
  // subnet parent of this NIC.
  const destinationIp = spec.properties.ipConfigurations
    .map(ip => ip.properties.privateIPAddress)
    .join(',');

  return {
    destination: inboundKey,
    constraints: {destinationIp},
  };
}