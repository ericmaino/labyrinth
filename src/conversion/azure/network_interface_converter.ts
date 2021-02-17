import {NodeSpec} from '../../graph';

import {IEntityStore} from '..';

import {
  AnyAzureObject,
  AzureNetworkInterface,
  IAzureConverter,
  IpConverters,
  ItemMoniker,
  parseMonikers,
} from '.';

function parseNetworkAliases(nic: AzureNetworkInterface): ItemMoniker[] {
  const aliases = parseMonikers(nic);

  for (const config of nic.properties.ipConfigurations) {
    const converter = IpConverters.asConverter(config);

    if (converter) {
      for (const alias of converter.monikers(config)) {
        aliases.push({
          item: alias.item,
          alias: `${nic.name}/${alias.alias}`,
        });
      }
    }
  }

  return aliases;
}

function parseNetworkNodeSpecs(
  nic: AzureNetworkInterface,
  store: IEntityStore<AnyAzureObject>
): NodeSpec[] {
  const nodes: NodeSpec[] = [];

  for (const config of nic.properties.ipConfigurations) {
    const converter = IpConverters.asConverter(config);

    if (converter) {
      for (const ipNodes of converter.convert(config, store)) {
        nodes.push(ipNodes);
      }
    }
  }
  return nodes;
}

export const NetworkInterfaceConverter: IAzureConverter<AzureNetworkInterface> = {
  supportedType: 'microsoft.network/networkinterfaces',
  monikers: parseNetworkAliases,
  convert: parseNetworkNodeSpecs,
};
