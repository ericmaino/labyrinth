import {IEntityStore, NodeSpec} from '../..';

import {AnyAzureObject} from '.';

export interface ItemAlias {
  readonly item: AnyAzureObject | undefined;
  readonly alias: string;
}

export interface IAzureConverter {
  readonly supportedType: string;
  aliases(input: AnyAzureObject): ItemAlias[];
  convert(
    input: AnyAzureObject,
    stores: IEntityStore<AnyAzureObject>
  ): NodeSpec[];
}
