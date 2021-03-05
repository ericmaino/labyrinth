import {assert} from 'chai';
import 'mocha';

import {Universe} from '../../src/dimensions';

import {
  AnyRuleSpec,
  Graph,
  GraphBuilder,
  GraphFormattingOptions,
  GraphSpec,
  NodeSpec,
} from '../../src/graph';

import {ActionType} from '../../src/rules';
import {createSimplifier} from '../../src/setops';
import {firewallSpec} from '../../src/specs';

import {trim} from '../shared';

const universe = new Universe(firewallSpec);
const simplifier = createSimplifier<AnyRuleSpec>(universe);

function paths(
  graph: Graph,
  from: string,
  to: string,
  options: GraphFormattingOptions
) {
  const {flows} = graph.analyze(from, !!options.outbound, true);
  const filtered = flows.filter(flow => flow.node.key === to);
  return filtered
    .map(flow =>
      graph.formatFlow(flow, {
        showPaths: true,
        verbose: true,
        ...options,
      })
    )
    .join('\n');
}

// Convenience function.
// Creates a GraphSpec with no symbols from a NodeSpec[].
function graphBuilder(nodes: NodeSpec[]): GraphBuilder {
  const spec: GraphSpec = {
    symbols: [],
    nodes,
  };

  return new GraphBuilder(universe, simplifier, spec);
}

describe('Graph', () => {
  describe('Errors', () => {
    it('unknown destination', () => {
      const nodes: NodeSpec[] = [
        {
          name: 'internet',
          key: 'internet',
          routes: [
            {
              destination: 'bad_key',
            },
          ],
        },
      ];
      const builder = graphBuilder(nodes);
      assert.throws(() => {
        builder.buildGraph();
      }, 'Unknown node "bad_key".');
    });

    it('duplicate node key', () => {
      const nodes: NodeSpec[] = [
        {
          name: 'internet',
          key: 'internet',
          routes: [
            {
              destination: 'bad_key',
            },
          ],
        },
        {
          name: 'internet',
          key: 'internet',
          routes: [
            {
              destination: 'bad_key',
            },
          ],
        },
      ];
      assert.throws(() => {
        graphBuilder(nodes);
      }, 'Duplicate node key "internet".');
    });

    it('unknown start point', () => {
      const nodes: NodeSpec[] = [
        {
          key: 'internet',
          routes: [
            {
              destination: 'gateway',
            },
          ],
        },
        {
          key: 'gateway',
          routes: [],
        },
      ];

      const builder = graphBuilder(nodes);
      const graph = builder.buildGraph();

      assert.throws(() => {
        graph.analyze('bad_key', true);
      }, 'Unknown node "bad_key".');
    });
  });

  describe('Cycles', () => {
    it('Simple cycle', () => {
      const nodes: NodeSpec[] = [
        {
          name: 'internet',
          key: 'internet',
          routes: [
            {
              destination: 'a',
            },
          ],
        },
        {
          name: 'a',
          key: 'a',
          routes: [
            {
              destination: 'b',
            },
          ],
        },
        {
          name: 'b',
          key: 'b',
          routes: [
            {
              destination: 'c',
            },
          ],
        },
        {
          name: 'c',
          key: 'c',
          routes: [
            {
              destination: 'a',
            },
          ],
        },
      ];
      const builder = graphBuilder(nodes);
      const graph = builder.buildGraph();
      const {cycles} = graph.analyze('internet', true);
      assert.equal(cycles.length, 1);
      const c = graph.formatCycle(cycles[0]);
      assert.equal(c, 'a => b => c => a');
    });

    it('Double cycle variant one', () => {
      const nodes: NodeSpec[] = [
        // Main line
        {
          key: 'main1',
          routes: [
            {
              destination: 'main2',
            },
          ],
        },
        {
          key: 'main2',
          routes: [
            {
              destination: 'main3',
            },
          ],
        },
        {
          key: 'main3',
          routes: [
            {
              destination: 'left1',
              constraints: {destinationPort: '1'},
            },
            {
              destination: 'right1',
              constraints: {destinationPort: '2'},
            },
            {
              destination: 'main4',
            },
          ],
        },
        {
          key: 'main4',
          routes: [],
        },

        // Left loop
        {
          key: 'left1',
          routes: [
            {
              destination: 'left2',
            },
          ],
        },
        {
          key: 'left2',
          routes: [
            {
              destination: 'main2',
            },
          ],
        },

        // Right loop
        {
          key: 'right1',
          routes: [
            {
              destination: 'right2',
            },
          ],
        },
        {
          key: 'right2',
          routes: [
            {
              destination: 'main2',
            },
          ],
        },
      ];

      const builder = graphBuilder(nodes);
      const graph = builder.buildGraph();
      const {cycles} = graph.analyze('main1', true);
      assert.equal(cycles.length, 2);
      const c0 = graph.formatCycle(cycles[0], true);
      assert.equal(
        c0,
        'main2 => main3 => left1 => left2 => main2\n  destination port: 1'
      );

      const c1 = graph.formatCycle(cycles[1], true);
      assert.equal(
        c1,
        'main2 => main3 => right1 => right2 => main2\n  destination port: 2'
      );
    });

    it('Double cycle variant two', () => {
      const nodes: NodeSpec[] = [
        // Main line
        {
          key: 'main1',
          routes: [
            {
              destination: 'main2',
            },
          ],
        },
        {
          key: 'main2',
          routes: [
            {
              destination: 'right1',
              constraints: {destinationPort: '2'},
            },
            {
              destination: 'main3',
            },
          ],
        },
        {
          key: 'main3',
          routes: [
            {
              destination: 'left1',
              constraints: {destinationPort: '1'},
            },
            {
              destination: 'main2',
              constraints: {destinationPort: '2'}, // Intended test case
            },
            {
              destination: 'main4',
            },
          ],
        },
        {
          key: 'main4',
          routes: [],
        },

        // Left loop
        {
          key: 'left1',
          routes: [
            {
              destination: 'left2',
            },
          ],
        },
        {
          key: 'left2',
          routes: [
            {
              destination: 'main2',
            },
          ],
        },

        // Right loop
        {
          key: 'right1',
          routes: [
            {
              destination: 'right2',
            },
          ],
        },
        {
          key: 'right2',
          routes: [
            {
              destination: 'main3',
            },
          ],
        },
      ];

      const builder = graphBuilder(nodes);
      const graph = builder.buildGraph();
      const {cycles} = graph.analyze('main1', true);
      // for (const c of cycles) {
      //   console.log(graph.formatCycle(c, true));
      // }

      assert.equal(cycles.length, 2);
      const c0 = graph.formatCycle(cycles[0], true);
      const c1 = graph.formatCycle(cycles[1], true);

      assert.equal(
        c0,
        'main2 => right1 => right2 => main3 => main2\n  destination port: 2'
      );
      assert.equal(
        c1,
        'main2 => main3 => left1 => left2 => main2\n  destination port: 1'
      );
    });

    // Loopback to endpoint is not a cycle
    it('Loopback to endpoint is not a cycle', () => {
      const nodes: NodeSpec[] = [
        {
          name: 'internet',
          key: 'internet',
          endpoint: true,
          routes: [
            {
              destination: 'a',
            },
          ],
        },
        {
          name: 'a',
          key: 'a',
          routes: [
            {
              destination: 'b',
            },
          ],
        },
        {
          name: 'b',
          key: 'b',
          routes: [
            {
              destination: 'c',
            },
          ],
        },
        {
          name: 'c',
          key: 'c',
          routes: [
            {
              destination: 'internet',
            },
          ],
        },
      ];
      const builder = graphBuilder(nodes);
      const graph = builder.buildGraph();
      const {cycles} = graph.analyze('internet', true);
      assert.equal(cycles.length, 0);
    });
  });

  // Forward propagate
  describe('Forward propagate', () => {
    it('Linear unidirectional', () => {
      const nodes: NodeSpec[] = [
        {
          key: 'a',
          endpoint: true,
          routes: [
            {
              destination: 'b',
              constraints: {sourcePort: '1'},
            },
          ],
        },
        {
          key: 'b',
          routes: [
            {
              destination: 'c',
              constraints: {destinationPort: '2'},
            },
          ],
        },
        {
          key: 'c',
          routes: [
            {
              destination: 'd',
              constraints: {protocol: 'tcp'},
            },
          ],
        },
        {
          key: 'd',
          endpoint: true,
          routes: [],
        },
      ];

      const builder = graphBuilder(nodes);
      const graph = builder.buildGraph();
      const outbound = true;

      assert.equal(
        paths(graph, 'a', 'd', {outbound}),
        trim(`
          d:
            routes:
              source port: 1
              destination port: 2
              protocol: tcp

            paths:
              a => b => c => d
                source port: 1
                destination port: 2
                protocol: tcp`)
      );

      assert.equal(
        paths(graph, 'd', 'a', {outbound}),
        trim(`
          a:
            routes:
              (no routes)

            paths:
              (no paths)`)
      );
    });

    it('Linear bidirectional', () => {
      const nodes: NodeSpec[] = [
        {
          key: 'a',
          endpoint: true,
          routes: [
            {
              destination: 'b',
              constraints: {
                destinationIp: '10.0.0.0/8',
                sourcePort: '1',
              },
            },
          ],
        },
        {
          key: 'b',
          routes: [
            {
              destination: 'c',
              constraints: {
                destinationIp: '10.0.0.0/8',
                destinationPort: '2',
              },
            },
            {
              destination: 'a',
            },
          ],
        },
        {
          key: 'c',
          routes: [
            {
              destination: 'd',
              constraints: {
                destinationIp: '10.0.0.0/8',
                protocol: 'tcp',
              },
            },
            {
              destination: 'b',
            },
          ],
        },
        {
          key: 'd',
          endpoint: true,
          routes: [
            {
              destination: 'c',
              constraints: {destinationIp: 'except 10.0.0.0/8'},
            },
          ],
        },
      ];

      const builder = graphBuilder(nodes);
      const graph = builder.buildGraph();
      const outbound = true;

      assert.equal(
        paths(graph, 'a', 'd', {outbound}),
        trim(`
          d:
            routes:
              source port: 1
              destination ip: 10.0.0.0/8
              destination port: 2
              protocol: tcp

            paths:
              a => b => c => d
                source port: 1
                destination ip: 10.0.0.0/8
                destination port: 2
                protocol: tcp`)
      );

      assert.equal(
        paths(graph, 'd', 'a', {outbound}),
        trim(`
          a:
            routes:
              destination ip: except 10.0.0.0/8

            paths:
              d => c => b => a
                destination ip: except 10.0.0.0/8`)
      );
    });

    it('Confluence', () => {
      const nodes: NodeSpec[] = [
        {
          key: 'main1',
          endpoint: true,
          routes: [
            {
              destination: 'left',
              constraints: {destinationIp: '10.0.0.0/8'},
            },
            {
              destination: 'right',
              constraints: {destinationIp: '11.0.0.0/8'},
            },
          ],
        },
        {
          key: 'left',
          routes: [
            {
              destination: 'main2',
            },
          ],
        },
        {
          key: 'right',
          routes: [
            {
              destination: 'main2',
            },
          ],
        },
        {
          key: 'main2',
          endpoint: true,
          routes: [],
        },
      ];

      const builder = graphBuilder(nodes);
      const graph = builder.buildGraph();
      const outbound = true;

      assert.equal(
        paths(graph, 'main1', 'main2', {outbound}),
        trim(`
          main2:
            routes:
              destination ip: 10.0.0.0/7

            paths:
              main1 => left => main2
                destination ip: 10.0.0.0/8
              main1 => right => main2
                destination ip: 11.0.0.0/8`)
      );
    });

    it('Upstream shadows downstream', () => {
      const nodes: NodeSpec[] = [
        {
          key: 'main',
          endpoint: true,
          routes: [
            {
              destination: 'a',
              constraints: {destinationIp: '10.0.0.0/8'},
            },
            {
              destination: 'b',
              constraints: {destinationIp: '10.0.0.0/8'},
            },
            {
              destination: 'c',
              constraints: {destinationIp: '10.0.0.0/7'},
            },
          ],
        },
        {
          key: 'a',
          endpoint: true,
          routes: [],
        },
        {
          key: 'b',
          endpoint: true,
          routes: [],
        },
        {
          key: 'c',
          endpoint: true,
          routes: [],
        },
      ];

      const builder = graphBuilder(nodes);
      const graph = builder.buildGraph();
      const outbound = true;

      assert.equal(
        paths(graph, 'main', 'a', {outbound}),
        trim(`
          a:
            routes:
              destination ip: 10.0.0.0/8

            paths:
              main => a
                destination ip: 10.0.0.0/8`)
      );

      assert.equal(
        paths(graph, 'main', 'b', {outbound}),
        trim(`
          b:
            routes:
              (no routes)

            paths:
              (no paths)`)
      );

      assert.equal(
        paths(graph, 'main', 'c', {outbound}),
        trim(`
          c:
            routes:
              destination ip: 11.0.0.0/8

            paths:
              main => c
                destination ip: 11.0.0.0/8`)
      );
    });

    it('Complex', () => {
      const nodes: NodeSpec[] = [
        {
          name: 'internet',
          key: 'internet',
          endpoint: true,
          routes: [
            {
              destination: 'gateway',
            },
          ],
        },
        {
          name: 'gateway',
          key: 'gateway',
          routes: [
            {
              destination: 'subnet1',
              constraints: {destinationIp: '10.0.0.0/8'},
            },
            {
              destination: 'subnet2',
              constraints: {destinationIp: '10.0.0.0/7'},
            },
          ],
        },
        {
          name: 'subnet1',
          key: 'subnet1',
          routes: [
            {
              destination: 'subnet2',
              constraints: {destinationPort: '80'},
            },
            {
              destination: 'subnet3',
            },
          ],
        },
        {
          name: 'subnet2',
          key: 'subnet2',
          routes: [
            {
              destination: 'server',
              constraints: {protocol: 'tcp'},
            },
          ],
        },
        {
          name: 'subnet3',
          key: 'subnet3',
          routes: [],
        },
        {
          name: 'server',
          key: 'server',
          endpoint: true,
          routes: [],
        },
      ];

      const builder = graphBuilder(nodes);
      const graph = builder.buildGraph();
      const outbound = true;
      const {cycles, flows} = graph.analyze('internet', outbound);

      assert.equal(cycles.length, 0);

      const observed = flows
        .map(flow => graph.formatFlow(flow, {outbound, showPaths: true}))
        .join('\n');

      const expected = trim(`
        internet:
          routes:
            (no routes)

          paths:
            (no paths)
        gateway:
          routes:
            (universe)

          paths:
            internet => gateway
        subnet1:
          routes:
            destination ip: 10.0.0.0/8

          paths:
            internet => gateway => subnet1
        subnet2:
          routes:
            destination ip: 10.0.0.0/8
            destination port: http
        
            destination ip: 11.0.0.0/8

          paths:
            internet => gateway => subnet1 => subnet2
            internet => gateway => subnet2
        subnet3:
          routes:
            destination ip: 10.0.0.0/8
            destination port: except http

          paths:
            internet => gateway => subnet1 => subnet3
        server:
          routes:
            destination ip: 10.0.0.0/8
            destination port: http
            protocol: tcp
        
            destination ip: 11.0.0.0/8
            protocol: tcp

          paths:
            internet => gateway => subnet1 => subnet2 => server
            internet => gateway => subnet2 => server`);

      assert.equal(observed, expected);
    });
  });

  describe('Backward propagate', () => {
    it('Linear with two NATs', () => {
      const nodes: NodeSpec[] = [
        {
          key: 'client',
          endpoint: true,
          range: {
            sourceIp: '192.0.2.53',
          },
          routes: [
            {
              destination: 'publicIp',
              constraints: {
                destinationIp: '203.0.113.1',
              },
            },
          ],
        },
        {
          key: 'publicIp',
          routes: [
            {
              destination: 'firewall',
              constraints: {
                destinationIp: '203.0.113.1',
              },
              override: {
                destinationIp: '10.0.0.2',
                sourceIp: '10.0.0.1',
              },
            },
          ],
        },
        {
          key: 'firewall',
          filters: [
            {
              action: ActionType.ALLOW,
              priority: 0,
              constraints: {
                destinationPort: 'http, https, 2201-2202',
              },
            },
          ],
          routes: [
            {
              destination: 'loadBalancer',
            },
          ],
        },
        {
          key: 'loadBalancer',
          routes: [
            {
              destination: 'serverA',
              constraints: {
                destinationPort: '2201',
              },
              override: {
                destinationIp: '20.0.0.1',
                sourceIp: '10.0.0.3',
                destinationPort: '22',
              },
            },
            {
              destination: 'serverB',
              constraints: {
                destinationPort: '2202',
              },
              override: {
                destinationIp: '20.0.0.2',
                sourceIp: '10.0.0.3',
                destinationPort: '22',
              },
            },
          ],
          pool: [
            {
              destination: 'serverA',
              override: {
                destinationIp: '20.0.0.1',
                sourceIp: '10.0.0.3',
              },
            },
            {
              destination: 'serverB',
              override: {
                destinationIp: '20.0.0.2',
                sourceIp: '10.0.0.3',
              },
            },
          ],
        },
        {
          key: 'serverA',
          range: {
            sourceIp: '20.0.0.1',
          },
          endpoint: true,
          routes: [],
        },
        {
          key: 'serverB',
          range: {
            sourceIp: '20.0.0.2',
          },
          endpoint: true,
          routes: [],
        },
      ];

      const builder = graphBuilder(nodes);
      const graph = builder.buildGraph();
      const backProject = true;
      const outbound = true;

      assert.equal(
        paths(graph, 'client', 'serverA', {outbound, backProject}),
        trim(`
          serverA:
            routes:
              source ip: 10.0.0.3
              destination ip: 20.0.0.1
              destination port: ssh, http, https
          
            paths:
              client => publicIp => firewall => loadBalancer => serverA
                destination ip: 203.0.113.1
                destination port: 2201
              client => publicIp => firewall => loadBalancer => serverA
                destination ip: 203.0.113.1
                destination port: http, https`)
      );

      assert.equal(
        paths(graph, 'client', 'serverB', {outbound, backProject}),
        trim(`
          serverB:
            routes:
              source ip: 10.0.0.3
              destination ip: 20.0.0.2
              destination port: ssh, http, https
          
            paths:
              client => publicIp => firewall => loadBalancer => serverB
                destination ip: 203.0.113.1
                destination port: 2202
              client => publicIp => firewall => loadBalancer => serverB
                destination ip: 203.0.113.1
                destination port: http, https`)
      );
    });
  });

  describe('Filters', () => {
    it('Inbound', () => {
      const nodes: NodeSpec[] = [
        {
          key: 'main1',
          endpoint: true,
          routes: [
            {
              destination: 'main2',
            },
          ],
        },
        {
          key: 'main2',
          filters: [
            {
              action: ActionType.DENY,
              priority: 0,
              constraints: {destinationPort: '1'},
            },
            {
              action: ActionType.ALLOW,
              priority: 1,
            },
          ],
          routes: [
            {
              destination: 'a',
              constraints: {destinationIp: '10.0.0.0/8'},
            },
            {
              destination: 'b',
              constraints: {destinationIp: '10.0.0.0/8'},
            },
            {
              destination: 'c',
              constraints: {destinationIp: '10.0.0.0/7'},
            },
          ],
        },
        {
          key: 'a',
          endpoint: true,
          routes: [],
        },
        {
          key: 'b',
          endpoint: true,
          routes: [],
        },
        {
          key: 'c',
          endpoint: true,
          routes: [],
        },
      ];

      const builder = graphBuilder(nodes);
      const graph = builder.buildGraph();
      const outbound = true;

      assert.equal(
        paths(graph, 'main1', 'a', {outbound}),
        trim(`
          a:
            routes:
              destination ip: 10.0.0.0/8
              destination port: except 1

            paths:
              main1 => main2 => a
                destination ip: 10.0.0.0/8
                destination port: except 1`)
      );

      assert.equal(
        paths(graph, 'main1', 'b', {outbound}),
        trim(`
          b:
            routes:
              (no routes)

            paths:
              (no paths)`)
      );

      assert.equal(
        paths(graph, 'main1', 'c', {outbound}),
        trim(`
          c:
            routes:
              destination ip: 11.0.0.0/8
              destination port: except 1

            paths:
              main1 => main2 => c
                destination ip: 11.0.0.0/8
                destination port: except 1`)
      );
    });

    it('Inbound and outbound', () => {
      const nodes: NodeSpec[] = [
        {
          key: 'main1',
          endpoint: true,
          routes: [
            {
              destination: 'main2',
            },
          ],
        },
        {
          key: 'main2',
          filters: [
            {
              action: ActionType.DENY,
              priority: 0,
              constraints: {destinationPort: '1'},
            },
            {
              action: ActionType.ALLOW,
              priority: 1,
            },
          ],
          routes: [
            {
              destination: 'a',
              constraints: {destinationIp: '10.0.0.0/8'},
              filters: [
                {
                  action: ActionType.DENY,
                  priority: 0,
                  constraints: {destinationPort: '2'},
                },
                {
                  action: ActionType.ALLOW,
                  priority: 1,
                },
              ],
            },
            {
              destination: 'b',
              constraints: {destinationIp: '10.0.0.0/8'},
            },
            {
              destination: 'c',
              constraints: {destinationIp: '10.0.0.0/7'},
            },
          ],
        },
        {
          key: 'a',
          endpoint: true,
          routes: [],
        },
        {
          key: 'b',
          endpoint: true,
          routes: [],
        },
        {
          key: 'c',
          endpoint: true,
          routes: [],
        },
      ];

      const builder = graphBuilder(nodes);
      const graph = builder.buildGraph();
      const outbound = true;

      assert.equal(
        paths(graph, 'main1', 'a', {outbound}),
        trim(`
          a:
            routes:
              destination ip: 10.0.0.0/8
              destination port: except 1-2

            paths:
              main1 => main2 => a
                destination ip: 10.0.0.0/8
                destination port: except 1-2`)
      );

      assert.equal(
        paths(graph, 'main1', 'b', {outbound}),
        trim(`
          b:
            routes:
              (no routes)

            paths:
              (no paths)`)
      );

      assert.equal(
        paths(graph, 'main1', 'c', {outbound}),
        trim(`
          c:
            routes:
              destination ip: 11.0.0.0/8
              destination port: except 1

            paths:
              main1 => main2 => c
                destination ip: 11.0.0.0/8
                destination port: except 1`)
      );
    });
  });
});
