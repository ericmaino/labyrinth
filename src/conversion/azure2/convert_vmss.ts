import {NodeSpec} from '../../graph';
import {AzureId} from './azure_id';
import {NodeKeyAndSourceIp} from './converters';
import {subnetKeys} from './convert_subnet';
import {GraphServices} from './graph_services';
import {AzureIdReference, AzureVirtualMachineScaleSet} from './types';

export function convertVmssIp(
  services: GraphServices,
  ipRefSpec: AzureIdReference
): NodeKeyAndSourceIp {
  const vmssIds = AzureId.parseAsVMSSIpConfiguration(ipRefSpec);
  const vmssSpec: AzureVirtualMachineScaleSet = services.index.dereference(
    vmssIds.vmssId
  );

  const networkConfig = vmssSpec.properties.virtualMachineProfile.networkProfile.networkInterfaceConfigurations.find(
    input => input.name === vmssIds.interfaceConfig
  );

  if (!networkConfig) {
    throw new TypeError(
      `Incomplete graph. Unable to locate VMSS '${vmssSpec.id}' with interface config '${vmssIds.interfaceConfig}'`
    );
  }

  const ipconfigSpec = networkConfig.properties.ipConfigurations.find(
    input => input.name === vmssIds.ipConfig
  );

  if (!ipconfigSpec) {
    throw new TypeError(
      `Incomplete graph. Unable to locate VMSS '${vmssSpec.id}' with ip config '${vmssIds.ipConfig}'`
    );
  }

  const subnet = subnetKeys(ipconfigSpec.properties.subnet);

  return {
    key: subnet.inbound,
    destinationIp: `${vmssSpec.name}/${vmssIds.logicalId}`,
  };
}
