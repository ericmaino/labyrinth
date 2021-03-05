import {NodeKeyAndSourceIp} from './converters';
import {GraphServices} from './graph_services';
import {AzureIdReference, AzureIPConfiguration, AzureObjectType} from './types';

const KEY_INTERNET = 'Internet';

export function convertKnownIp(
  services: GraphServices,
  ipConfig: AzureIPConfiguration
): NodeKeyAndSourceIp {
  if (ipConfig.type === AzureObjectType.LOCAL_IP) {
    if (!ipConfig.properties.subnet) {
      throw new TypeError(`Local IP '${ipConfig.id}' is not bound to a subnet`);
    }
    const subnet = services.index.dereference(ipConfig.properties.subnet);
    return {
      key: `${subnet.id}/inbound`,
      destinationIp: ipConfig.properties.privateIPAddress,
    };
  } else {
    return {key: KEY_INTERNET, destinationIp: ipConfig.properties.ipAddress};
  }
}

export function convertIp(
  services: GraphServices,
  ipRefSpec: AzureIdReference
): NodeKeyAndSourceIp {
  if (!services.index.has(ipRefSpec)) {
    return services.convert.vmssIp(services, ipRefSpec);
  }

  const ipConfig = services.index.dereference<AzureIPConfiguration>(ipRefSpec);
  return convertKnownIp(services, ipConfig);
}
