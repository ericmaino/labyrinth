import {AnyAzureObject, IEntityStore, ItemAlias, NodeSpec} from '../..';

export function parseAliases(input: AnyAzureObject): ItemAlias[] {
  const aliases: ItemAlias[] = [];
  aliases.push({
    item: input,
    alias: input.name,
  });
  return aliases;
}

export function skipProcessingNodeSpecs(
  // eslint-disable-next-line  @typescript-eslint/no-unused-vars
  input: AnyAzureObject,
  // eslint-disable-next-line  @typescript-eslint/no-unused-vars
  store: IEntityStore<AnyAzureObject>
): NodeSpec[] {
  const empty: NodeSpec[] = [];
  return empty;
}
