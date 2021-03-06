import commandLineUsage from 'command-line-usage';
import {Section} from 'command-line-usage';
import minimist from 'minimist';
import path from 'path';

import {Universe} from '../dimensions';

import {
  AnyRuleSpec,
  formatNodeName,
  Graph,
  GraphBuilder,
  loadYamlGraphSpecFile,
  Node,
  NodeType,
} from '../graph';

import {createSimplifier} from '../setops';
import {firewallSpec} from '../specs';
import {fail, handleError, succeed} from '../utilities';

interface Options {
  backProject: boolean;
  modelSpoofing: boolean;
  outbound: boolean;
  // TODO: rename shortenAndCollapse to expandPaths or equivalent
  shortenAndCollapse: boolean;
  showPaths: boolean;
  showRouters: boolean;
  verbose: boolean;
}

function main() {
  const args = minimist(process.argv.slice(2));

  if (args.h || args.help) {
    showUsage();
    return succeed(false);
  }

  if (args._.length === 0) {
    return fail('Error: expected a <network.yaml> file.');
  }

  if (args._.length > 1) {
    const extras = args._.slice(1)
      .map(x => `"${x}"`)
      .join(', ');
    return fail(`Error: undexpected parameters ${extras}.`);
  }

  if (args.c) {
    return fail('Cycle detection not implemented.');
  }

  const backProject = !!args.b;
  const fromNode = args.f;
  const modelSpoofing = !!args.s;
  const outbound = !!args.f;
  const showRouters = !!args.r;
  const shortenAndCollapse = !args.e;
  const toNode = args.t;
  const verbose = !!args.v;
  const showPaths = backProject || verbose || !!args.p;
  const universeFile = args.u;
  const graphFile = args._[0];

  const options: Options = {
    backProject,
    modelSpoofing,
    outbound,
    showPaths,
    showRouters,
    verbose,
    shortenAndCollapse,
  };

  try {
    // Initialize universe.
    const universe = universeFile
      ? Universe.fromYamlFile(universeFile)!
      : new Universe(firewallSpec);
    const simplifier = createSimplifier<AnyRuleSpec>(universe);

    // Load network graph.
    const spec = loadYamlGraphSpecFile(graphFile);
    const builder = new GraphBuilder(universe, simplifier, spec);
    const graph = builder.buildGraph();

    // TODO: put -t case first and include -t -f handling there so that we get
    // back-projection by default.
    if (!fromNode && !toNode) {
      listEndpoints(graph, showRouters);
      return fail('Use the -f or -t option to specify a node for analysis.');
    } else if (fromNode) {
      /////////////////////////////////////////////////////////////////////////
      //
      // Paths originating at fromNode
      //
      /////////////////////////////////////////////////////////////////////////
      const fNode = getNode(fromNode, graph, options.outbound);
      const fKey = fNode.key;
      let tNode: Node | undefined;
      let tKey: string | undefined;
      if (toNode) {
        tNode = getNode(toNode, graph, options.outbound);
        tKey = tNode.key;
      }

      const {cycles, flows} = graph.analyze(
        fKey,
        options.outbound,
        modelSpoofing
      );

      summarizeOptions(options);
      listEndpoints(graph, showRouters);

      if (cycles.length > 0) {
        console.log(`Cycles reachable from ${formatNodeName(fNode)}:`);
        for (const cycle of cycles) {
          console.log('  ' + graph.formatCycle(cycle, verbose));
          console.log();
        }
        console.log();
      }

      if (tNode) {
        console.log(
          `Routes from ${formatNodeName(fNode)} to ${formatNodeName(tNode)}:`
        );
      } else {
        console.log(`Nodes reachable from ${formatNodeName(fNode)}:`);
      }
      console.log();

      for (const flow of flows) {
        if (tKey) {
          if (tKey === flow.node.key) {
            console.log(graph.formatFlow(flow, options));
            console.log();
          }
        } else if (
          fromNode !== flow.node.spec.key &&
          (showRouters || flow.node.isEndpoint) &&
          !flow.routes.isEmpty()
        ) {
          console.log(graph.formatFlow(flow, options));
          console.log();
        }
      }
    } else {
      /////////////////////////////////////////////////////////////////////////
      //
      // Paths ending at toNode
      //
      /////////////////////////////////////////////////////////////////////////
      const tNode = getNode(toNode, graph, options.outbound);
      const tKey = tNode.key;

      const {cycles, flows} = graph.analyze(
        tKey,
        options.outbound,
        modelSpoofing
      );

      summarizeOptions(options);
      listEndpoints(graph, showRouters);

      if (cycles.length > 0) {
        console.log(`Cycles on paths to ${formatNodeName(tNode)}:`);
        for (const cycle of cycles) {
          console.log('  ' + graph.formatCycle(cycle));
          console.log();
        }
        console.log();
      }

      console.log(`Nodes that can reach ${formatNodeName(tNode)}:`);
      console.log();

      for (const flow of flows) {
        if (
          tKey !== flow.node.spec.key &&
          (showRouters || flow.node.isEndpoint) &&
          !flow.routes.isEmpty()
        ) {
          console.log(graph.formatFlow(flow, options));
          console.log();
        }
      }
    }
  } catch (e) {
    handleError(e);
  }

  return succeed(true);
}

function showUsage() {
  const program = path.basename(process.argv[1]);

  const usage: Section[] = [
    {
      header: 'Network graph reachability analyzer',
      content: 'Utility for analyzing reachability in networks.',
    },
    {
      header: 'Usage',
      content: [`node ${program} {underline <network.yaml>} [...options]`],
    },
    {
      header: 'Required Parameters',
      content: [
        {
          name: '{underline <network.yaml>}',
          summary:
            'Path to a yaml file the defines the network topology and ' +
            'its routing and filtering rules.',
        },
      ],
    },
    {
      header: 'Options',
      optionList: [
        {
          name: 'from',
          alias: 'f',
          typeLabel: '{underline <node>}',
          description:
            'Find all paths in the graph that start at {underline <node>}.',
        },
        {
          name: 'to',
          alias: 't',
          typeLabel: '{underline <node>}',
          description:
            'Find all paths in the graph that can reach {underline <node>}.',
        },
        {
          name: 'universe',
          alias: 'u',
          typeLabel: '{underline <universe.yaml>}',
          description: `Use provided Universe specification.
                        Default Universe is for firewall rules with
                        - source ip
                        - source port
                        - destination ip
                        - destination port
                        - protocol\n`,
          type: Boolean,
        },
        {
          name: 'verbose',
          alias: 'v',
          description: 'Display routes for each path.',
          type: Boolean,
        },
        {
          name: 'cycles',
          alias: 'c',
          description: 'Find all cycles in the graph.',
          type: Boolean,
        },
        {
          name: 'paths',
          alias: 'p',
          description: 'Displays paths for each route.',
          type: Boolean,
        },
        {
          name: 'routers',
          alias: 'r',
          description: 'Display routers along paths.',
          type: Boolean,
        },
        {
          name: 'spoofing',
          alias: 's',
          description: 'Model source address spoofing.',
          type: Boolean,
        },
        {
          name: 'back-project',
          alias: 'b',
          description: 'Backproject routes through NAT rewrites.',
          type: Boolean,
        },
        {
          name: 'expand',
          alias: 'e',
          description: 'Expand paths to show internal nodes.',
          type: Boolean,
        },
      ],
    },
  ];

  console.log(commandLineUsage(usage));
}

function listEndpoints(graph: Graph, showRouters: boolean) {
  console.log(showRouters ? 'Nodes:' : 'Endpoints');

  const friendlyNames = [...graph.friendlyNames()].sort();
  for (const name of friendlyNames) {
    const nodes = graph.withFriendlyName(name);
    const endpointCount = nodes.endpoints().length;
    if (showRouters || endpointCount > 0) {
      console.log(`  ${name}`);

      if (endpointCount > 0) {
        for (const node of nodes.all()) {
          console.log(
            `    ${node.key}: ${node.range.format().slice(11)}${
              node.isEndpoint ? ' (endpoint)' : ''
            }`
          );
        }
      }
    }
  }
  console.log();
}

function summarizeOptions(options: Options) {
  console.log('Options summary:');

  if (options.modelSpoofing) {
    console.log('  Modeling source ip address spoofing (-s).');
  } else {
    console.log(
      '  Not modeling source ip address spoofing (use -s flag to enable).'
    );
  }

  if (options.showRouters) {
    console.log('  Displaying endpoints and routing nodes. (-r)');
  } else {
    console.log(
      '  Displaying endpoints only (use -r flag to display routing nodes). '
    );
  }

  if (options.showPaths) {
    console.log('  Displaying paths (-p or -v).');
  } else {
    console.log('  Not displaying paths (use -s or -v flags to enable).');
  }

  if (options.showPaths) {
    console.log('  Verbose mode (-v).');
  } else {
    console.log('  Brief mode (use -v flag to enable verbose mode).');
  }

  if (options.backProject) {
    console.log('  Backprojecting paths past NAT rewrites. (-b)');
  } else {
    console.log(
      '  Paths are forward propagated (use -b flag to enable backprojection).'
    );
  }

  if (options.shortenAndCollapse) {
    console.log(
      '  Paths are not expanded (use -e flag to enable path expansion).'
    );
  } else {
    console.log('  Expanding paths to show internal nodes. (-e)');
  }

  console.log();
}

function getNode(name: string, graph: Graph, outbound: boolean) {
  const nodes = graph.withFriendlyName(name);
  const node =
    nodes.withType(NodeType.PUBLIC_ENDPOINT) ??
    nodes.withType(outbound ? NodeType.OUTBOUND : NodeType.INBOUND) ??
    graph.withKey(name);

  return node || fail(`Unknown ${outbound ? 'start' : 'end'} node ${name}`);
}

main();
