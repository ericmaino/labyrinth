import {UniverseDefinition} from '../graph_services';
import {azureInternet} from './azure.internet.spec';
import {azurePublicIpSpec} from './azure.services.spec';

interface ServiceSpec {
  id: string;
  properties: {
    addressPrefixes: string[];
  };
}

function createSymbolMap(services: ServiceSpec[]): Map<string, string[]> {
  const map = new Map<string, string[]>();

  for (const service of services) {
    const addresses = service.properties.addressPrefixes.filter(
      x => x.indexOf('.') > 0
    );

    if (addresses.length > 0) {
      map.set(service.id, addresses);
    }
  }

  return map;
}

export const azureUniverse: UniverseDefinition = {
  internet: azureInternet,
  symbols: createSymbolMap(azurePublicIpSpec.values),
};
