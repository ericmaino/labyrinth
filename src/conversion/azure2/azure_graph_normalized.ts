import {AzureTypedObject} from '../azure/types';

import {AzureGraphNode, DefaultNode, IAzureGraphNode} from './azure_graph_node';
import {LoadBalancerNode} from './convert_load_balancer';
import {NetworkInterfaceNode} from './convert_network_interface';
import {SubnetNode} from './convert_subnet';
import {VirtualNetworkNode} from './convert_vnet';
import {GraphE} from './graph_e';
import {AnyAzureObject, AzureObjectType, AzureReference} from './types';

export class NormalizedAzureGraph extends GraphE<
  AzureTypedObject,
  IAzureGraphNode
> {
  private readonly typeMap = new Map<AzureObjectType, Set<IAzureGraphNode>>();

  constructor() {
    super(NormalizedAzureGraph.createNode);
  }

  addNode(input: AzureTypedObject): IAzureGraphNode {
    const node = super.addNode(input);
    this.addTypedNode(node);
    return node;
  }

  // TODO: REVIEW: is it worth forgoing runtime type safety as this function
  // does, or should we insist on checks like asAzureVirtualNetwork()?
  // Also, do we wanta dereference() method that knows about AzureReferences
  // or should we just rely on the basic getItem()?
  dereference<T extends AnyAzureObject>(ref: AzureReference<T>) {
    const node = this.getNode<AzureGraphNode<T>>(ref.id);
    return node.value;
  }

  virtualNetworks(): IterableIterator<VirtualNetworkNode> {
    return this.nodesOf<VirtualNetworkNode>(AzureObjectType.VIRTUAL_NETWORK);
  }

  private *nodesOf<T extends IAzureGraphNode>(
    type: AzureObjectType
  ): IterableIterator<T> {
    const set = this.typeMap.get(type);

    if (set) {
      for (const item of set.values()) {
        yield item as T;
      }
    }
  }

  private addTypedNode(node: IAzureGraphNode): void {
    let set = this.typeMap.get(node.type);

    if (!set) {
      set = new Set<IAzureGraphNode>();
      this.typeMap.set(node.type, set);
    }

    set.add(node);
  }

  private static createNode(azureType: AzureTypedObject): IAzureGraphNode {
    const input = azureType as AnyAzureObject;
    switch (input.type) {
      case AzureObjectType.VIRTUAL_NETWORK:
        return new VirtualNetworkNode(input);
      case AzureObjectType.SUBNET:
        return new SubnetNode(input);
      case AzureObjectType.NIC:
        return new NetworkInterfaceNode(input);
      case AzureObjectType.LOAD_BALANCER:
        return new LoadBalancerNode(input);
      default:
        return new DefaultNode(input);
    }
  }
}
