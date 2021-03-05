import {GraphSpec} from '../../graph';

import {convertIp} from './convert_ip';
import {IConverters} from './converters';
import {
  convertBackendPool,
  convertLoadBalancer,
  convertLoadBalancerIp,
} from './convert_load_balancer';
import {convertResourceGraph} from './convert_resource_graph';
import {convertSubnet} from './convert_subnet';
import {convertVNet} from './convert_vnet';
import {convertNsg} from './convert_network_security_group';
import {GraphServices} from './graph_services';
import {SymbolTable} from './symbol_table';
import {AzureResourceGraph} from './types';

import {walkAzureTypedObjects} from './walk';
import {convertVmssIp} from './convert_vmss';
import {NormalizedAzureGraph} from './azure_graph_normalized';

// TODO: Move `converters` to own file.
const converters: IConverters = {
  resourceGraph: convertResourceGraph,
  subnet: convertSubnet,
  vnet: convertVNet,
  nsg: convertNsg,
  ip: convertIp,
  backendPool: convertBackendPool,
  loadBalancer: convertLoadBalancer,
  loadBalancerIp: convertLoadBalancerIp,
  vmssIp: convertVmssIp,
};

export function convert(resourceGraphSpec: AzureResourceGraph): GraphSpec {
  //
  // Shorten names in graph.
  //

  // // Populate shortener with ids from AzureTypedObjects.
  // const shortener = new NameShortener();
  // for (const item of walkAzureTypedObjects(resourceGraphSpec)) {
  //   shortener.add(item.id);
  // }

  // // Actually shorten names
  // // TODO: this needs to convert references in addition to AnyAzureObjects
  // // REVIEW: what if we need the old id and the new id in the node.
  // for (const item of walkAzureObjectBases(resourceGraphSpec)) {
  //   item.id = shortener.shorten(item.id);
  // }

  //
  // Initialize GraphServices
  //
  const symbols = new SymbolTable([
    {
      dimension: 'ip',
      symbol: 'AzureLoadBalancer',
      range: '168.63.129.16',
    },
    {
      dimension: 'protocol',
      symbol: 'Tcp',
      range: 'tcp',
    },
  ]);

  // TODO.. Might be able to get away with the index...
  //const index = new AzureObjectIndex(resourceGraphSpec);

  const azureGraph = new NormalizedAzureGraph();

  for (const spec of walkAzureTypedObjects(resourceGraphSpec)) {
    azureGraph.addNode(spec);
  }

  const services = new GraphServices(converters, symbols, azureGraph);

  //
  // Convert the AzureResourceGraph
  //
  // Could also write
  //   converters.resourceGraph(services, resourceGraph);
  services.convert.resourceGraph(services, resourceGraphSpec);

  // Emit the GraphSpec
  const graph = services.getLabyrinthGraphSpec();

  return graph;
}

export const DefaultConverterConfig = converters;
