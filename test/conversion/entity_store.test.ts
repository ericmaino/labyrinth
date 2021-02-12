import {assert} from 'chai';
import 'mocha';
import {AzureLocalIP, EntityStore} from '../../src/conversion';

describe('EntityStore', () => {
  const store = new EntityStore();

  describe('Not found element throws exception', () => {
    assert.throw(() => {
      store.getEntity('entity-not-found');
    }, "Failed to find item with id 'entity-not-found'");
  });

  describe('Not found element throws exception', () => {
    const expectedItem = {
      id: 'test',
      name: 'test name',
      resourceGroup: 'resource-group',
      type: 'Microsoft.Network/networkInterfaces/ipConfigurations',
      properties: {
        privateIPAddress: '127.0.0.1',
      },
    } as AzureLocalIP;

    store.registerEntity(expectedItem, 'alias');
    const result = store.getEntity(expectedItem.id);
    assert.equal(result, expectedItem);
  });
});
