import {AzureReference, AzureVirtualMachineScaleSet} from './azure_types';

export interface AzureVMSSIpResult {
  readonly vmssId: AzureReference<AzureVirtualMachineScaleSet>;
  readonly interfaceConfig: string;
  readonly ipConfig: string;
  readonly logicalId: number;
}

// DESIGN NOTE: Azure Resource IDs
// Azure resource ids appear to use the following format
//
// Prefix
// /subscriptions/{sub id}/resourceGroups/{resource group name}
//       1            2          3                  4
//
// TopLevelItem
// {Prefix}/providers/{provider}/{type}/{resource name}
//             5          6         7          8
//
// Sub Resource Items
// Level 1
//   {Top Level Item}/{item type}/{name}
//                     9          10
// Level 2
//   {Level 1}/{item type}/{name}
//                11         12
// Level 3
//   {Level 2}/{item type}/{name}
//                13         14
//
// Example Level 3 Id
// /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/vnet/providers/Microsoft.Compute/virtualMachineScaleSets/vmss/virtualMachines/0/networkInterfaces/nic01/ipConfigurations/ipconfig01
enum ResourceLevels {
  TopLevelType = 7,
  TopLevel = 8,
  SubResourceType = 9,
  SubResource = 10,
  SubResource2Type = 11,
  SubResource2 = 12,
  SubResource3Type = 13,
  SubResource3 = 14,
}

enum ResourceTypes {
  IpConfigurations = 'ipconfigurations',
  NetworkInterfaces = 'networkinterfaces',
  VirtualMachines = 'virtualmachines',
  VirtualMachineScaleSet = 'virtualmachinescalesets',
}

export function isValidVMSSIpConfigId(id: string): boolean {
  return isTypeAndLevel(
    id,
    ResourceTypes.VirtualMachineScaleSet,
    ResourceLevels.SubResource3,
    ResourceTypes.IpConfigurations
  );
}

export function isValidVMSSIpNic(id: string): boolean {
  return isTypeAndLevel(
    id,
    ResourceTypes.VirtualMachineScaleSet,
    ResourceLevels.SubResource2,
    ResourceTypes.NetworkInterfaces
  );
}

export function asNicConfigSpecId(input: AzureVMSSIpResult) {
  return [
    input.vmssId.id,
    ResourceTypes.VirtualMachines,
    input.logicalId,
    ResourceTypes.NetworkInterfaces,
    input.interfaceConfig,
  ]
    .join('/')
    .toLowerCase();
}

export function parseAsVMSSIpConfiguration(id: string): AzureVMSSIpResult {
  if (!isValidVMSSIpConfigId(id)) {
    throw new TypeError(`Invalid VMSS IP Configuration Id '${id}'`);
  }
  return parseAsVMSSResult(id);
}

// In the case of Load Balancers which are using VMSS there are references which
// do not contain direct items in the graph. This parsing function extracts the
// separates the id which then can be used to look up necessary downstream items
export function parseAsVMSSNicConfiguration(id: string): AzureVMSSIpResult {
  if (!isValidVMSSIpNic(id)) {
    throw new TypeError(`Invalid VMSS NIC Configuration Id '${id}'`);
  }
  return parseAsVMSSResult(id);
}

export function getIpConfigWithNic(
  vmssIds: AzureVMSSIpResult,
  vmssSpec: AzureVirtualMachineScaleSet,
  useDefault = false
) {
  const networkConfig = vmssSpec.properties.virtualMachineProfile.networkProfile.networkInterfaceConfigurations.find(
    input => equalsIgnoreCase(input.name, vmssIds.interfaceConfig)
  );

  if (!networkConfig) {
    throw new TypeError(
      `Incomplete graph. Unable to locate VMSS '${vmssSpec.id}' with interface config '${vmssIds.interfaceConfig}'`
    );
  }

  let ipconfigSpec = networkConfig.properties.ipConfigurations.find(input =>
    equalsIgnoreCase(input.name, vmssIds.ipConfig)
  );

  if (!ipconfigSpec) {
    if (useDefault) {
      ipconfigSpec = networkConfig.properties.ipConfigurations[0];
    } else {
      throw new TypeError(
        `Incomplete graph. Unable to locate VMSS '${vmssSpec.id}' with ip config '${vmssIds.ipConfig}'`
      );
    }
  }

  return {
    nicSpec: networkConfig,
    ipconfigSpec,
  };
}

export function parseAsVMSSResult(id: string): AzureVMSSIpResult {
  const parts = normalizeAndSplitId(id);

  return {
    vmssId: {
      id: parts.slice(0, ResourceLevels.SubResourceType).join('/'),
      resourceGroup: '',
    },
    logicalId: Number.parseInt(parts[ResourceLevels.SubResource]),
    interfaceConfig: parts[ResourceLevels.SubResource2],
    ipConfig: parts[ResourceLevels.SubResource3],
  };
}

function isTypeAndLevel(
  id: string,
  topLevelType: ResourceTypes,
  expectedLevel: ResourceLevels,
  expectedSubType: ResourceTypes
) {
  const parts = normalizeAndSplitId(id);
  const level = getLevel(parts);
  const topType = parts[ResourceLevels.TopLevelType];
  const subType = parts[expectedLevel - 1];

  return (
    topLevelType === topType &&
    expectedLevel === level &&
    expectedSubType === subType
  );
}

function normalizeAndSplitId(input: string): string[] {
  return input.toLowerCase().split('/');
}

function getLevel(parts: string[]): ResourceLevels {
  switch (parts.length - 1) {
    case ResourceLevels.TopLevel:
      return ResourceLevels.TopLevel;
    case ResourceLevels.SubResource:
      return ResourceLevels.SubResource;
    case ResourceLevels.SubResource2:
      return ResourceLevels.SubResource2;
    case ResourceLevels.SubResource3:
      return ResourceLevels.SubResource3;
    default:
      throw new TypeError(`Unsupported resource level '${parts.length}'`);
  }
}

function equalsIgnoreCase(inputA: string, inputB: string) {
  return inputA?.toLowerCase() === inputB?.toLowerCase();
}