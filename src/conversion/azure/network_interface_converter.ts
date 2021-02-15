import {IEntityStore, NodeSpec} from '../..';

import {
  AnyAzureObject,
  AzureNetworkInterface,
  IAzureConverter,
  IpConverters,
  ItemAlias,
  parseAliases,
} from '.';

function parseNetworkAliases(input: AnyAzureObject): ItemAlias[] {
  const aliases = parseAliases(input);
  const nic = input as AzureNetworkInterface;

  for (const config of nic.properties.ipConfigurations) {
    const converter = IpConverters.asConverter(config);

    if (converter) {
      for (const alias of converter.aliases(config)) {
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
  input: AnyAzureObject,
  store: IEntityStore<AnyAzureObject>
): NodeSpec[] {
  const nodes: NodeSpec[] = [];
  const nic = input as AzureNetworkInterface;

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

export const NetworkInterfaceConverter = {
  supportedType: 'microsoft.network/networkinterfaces',
  aliases: parseNetworkAliases,
  convert: parseNetworkNodeSpecs,
} as IAzureConverter;
