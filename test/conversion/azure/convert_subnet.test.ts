import {assert} from 'chai';
import 'mocha';

import {NodeSpec} from '../../../src';

import {
  AzureNetworkSecurityGroup,
  convertSubnet,
  NSGRuleSpecs,
} from '../../../src/conversion/azure';

// DESIGN NOTE: considered namespacing these items, but their usage became
// too verbose. Expect that numbers in names (e.g. subnet1) prevent collisions
// with similar terms.
import {
  createGraphServicesMock,
  inboundRules,
  nic1,
  nsg1,
  outboundRules,
  subnet1,
  subnet1Id,
  subnet1SourceIps,
} from './sample_resource_graph';

export default function test() {
  describe('convertSubnet()', () => {
    it('Subnet with NSG and one NIC', () => {
      const {services, mocks} = createGraphServicesMock();

      // convertSubnet() expects to find its nsg spec in the index.
      services.index.add(nsg1);

      // convertSubnet() expects to find references to its nics.
      services.index.addReference(nic1, subnet1);

      mocks.nic.action(() => {
        return {
          destination: 'foo',
          constraints: {destinationIp: 'bar'},
        };
      });

      mocks.nsg.action(
        (nsgSpec: AzureNetworkSecurityGroup | undefined): NSGRuleSpecs => {
          if (nsgSpec === nsg1) {
            return {inboundRules, outboundRules};
          } else {
            throw 'Incorrect nsg spec';
          }
        }
      );

      // DESIGN NOTE: cannot call services.convert.vnet() because our intent
      // is to test the real convertVNet(), instead of its mock.
      const result = convertSubnet(services, subnet1, 'vnet1', 'vnet1');
      const {nodes, symbols} = services.getLabyrinthGraphSpec();

      // Verify no symbol table additions.
      assert.equal(symbols.length, 0);

      // Verify the return value.
      assert.equal(result.destination, 'subnet1/inbound');
      assert.equal(result.constraints.destinationIp, subnet1SourceIps);

      // Verify that nicConverter() was invoked correctly.
      const nicLog = mocks.nic.log();
      assert.equal(nicLog.length, 1);
      assert.equal(nicLog[0].params[1], nic1);
      assert.equal(nicLog[0].params[2], 'subnet1/outbound');
      assert.equal(nicLog[0].params[3], 'vnet1');

      // Verify that nsgConverter() was invoked correctly.
      const nsgLog = mocks.nsg.log();
      assert.equal(nsgLog.length, 1);
      assert.equal(nsgLog[0].params[0], nsg1);
      assert.equal(nsgLog[0].params[1], 'vnet1');

      // Verify that correct nodes were created.
      const expectedNodes: NodeSpec[] = [
        // Inbound
        {
          key: 'subnet1/inbound',
          name: subnet1Id + '/inbound',
          filters: inboundRules,
          routes: [
            {
              destination: 'foo',
              constraints: {destinationIp: 'bar'},
            },
          ],
        },

        // Outbound
        {
          key: 'subnet1/outbound',
          name: subnet1Id + '/outbound',
          filters: outboundRules,
          routes: [
            {
              destination: 'vnet1',
            },
          ],
        },
      ];

      assert.deepEqual(nodes, expectedNodes);
    });
  });
}
