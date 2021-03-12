import {convert} from '../conversion/azure/convert';
import {AnyAzureObject} from '../conversion/azure/types';
import {FileSystem, YAML} from '../io';

function main() {
  const file = 'load-balancer-2';
  const path = '/mnt/d/src/Hopcroft/labyrinth2/data';
  //const path = 'd:\\src\\Hopcroft\\labyrinth2\\data';

  const graph = FileSystem.readFileSyncAs<AnyAzureObject[]>(
    `${path}/${file}.json`
  );
  const outfile = `${path}/test.${file}`;
  const result = convert(graph);
  console.log(JSON.stringify(result));
  FileSystem.writeUtfFileSync(`${outfile}.json`, JSON.stringify(result));
  YAML.writeNodeGraphAsYamlFile(result, `${outfile}.yaml`);
}

main();
