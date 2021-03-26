import {getIpConfigWithNic, parseAsVMSSIpConfiguration} from '../azure_id';
import {
  AzureIndex,
  AzureObjectType,
  AzurePrivateIP,
  AzureSubnet,
  AzureVirtualMachineScaleSet,
} from '../azure_types';

export function createVmssIpSpec(
  id: string,
  index: AzureIndex
): AzurePrivateIP {
  const vmssId = parseAsVMSSIpConfiguration(id);
  const vmssSpec = index.dereference<AzureVirtualMachineScaleSet>(
    vmssId.vmssId
  );
  const vmssIpSpec = getIpConfigWithNic(vmssId, vmssSpec).ipconfigSpec;

  const subnet = index.dereference<AzureSubnet>(vmssIpSpec.properties.subnet);
  index.allocator.registerSubnet(subnet.id, subnet.properties.addressPrefix);

  const ip: AzurePrivateIP = {
    id,
    type: AzureObjectType.PRIVATE_IP,
    name: vmssIpSpec.name,
    resourceGroup: vmssSpec.resourceGroup,
    properties: {
      subnet: vmssIpSpec.properties.subnet,
      privateIPAddress: index.allocator.allocate(subnet.id, id),
    },
  };

  if (!index.has(ip.id)) {
    index.add(ip);
  }

  return ip;
}
