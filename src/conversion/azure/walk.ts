import {AzureObjectBase, AzureTypedObject} from './azure_types';

///////////////////////////////////////////////////////////////////////////////
//
// Generator for all nodes of type AzureObjectBase in an Azure ResourceGraph.
//
///////////////////////////////////////////////////////////////////////////////
export function* walkAzureTypedObjects(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  root: any
): IterableIterator<AzureTypedObject> {
  if (root && typeof root === 'object') {
    // NOTE: cannot use destructuring here because `root` is `any`.
    const id = root.id;
    const name = root.name;
    const resourceGroup = root.resourceGroup;
    const type = root.type;
    const keyCount = Object.keys(root).length;

    if (id && name && resourceGroup && type && keyCount > 4) {
      yield root;
    }

    for (const key in root) {
      // https://eslint.org/docs/rules/no-prototype-builtins
      if (!Object.prototype.hasOwnProperty.call(root, key)) {
        continue;
      }

      yield* walkAzureTypedObjects(root[key]);
    }
  }
}

export function* walkAzureObjectBases(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  root: any
): IterableIterator<AzureObjectBase> {
  if (root && typeof root === 'object') {
    // NOTE: cannot use destructuring here because `root` is `any`.
    const id = root.id;
    const resourceGroup = root.resourceGroup;

    if (id && resourceGroup) {
      yield root;
    }
    for (const key in root) {
      // https://eslint.org/docs/rules/no-prototype-builtins
      if (!Object.prototype.hasOwnProperty.call(root, key)) {
        continue;
      }

      yield* walkAzureObjectBases(root[key]);
    }
  }
}
