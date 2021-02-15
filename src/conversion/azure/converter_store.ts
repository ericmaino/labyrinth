import {
  IAzureConverter,
  AnyAzureObject,
  parseAliases,
  skipProcessingNodeSpecs,
} from '.';

const DefaultConverter = {
  supportedType: 'DefaultTypes',
  aliases: parseAliases,
  convert: skipProcessingNodeSpecs,
} as IAzureConverter;

export class ConverterStore {
  private readonly converters: Map<string, IAzureConverter>;
  private readonly defaultConverter: IAzureConverter;

  constructor(...converters: IAzureConverter[]) {
    this.converters = new Map<string, IAzureConverter>();
    this.defaultConverter = DefaultConverter;

    for (const converter of converters) {
      this.converters.set(converter.supportedType, converter);
    }
  }

  asConverter(input: AnyAzureObject): IAzureConverter {
    let converter = this.converters.get(input.type);

    if (!converter) {
      converter = this.defaultConverter;
    }

    return converter;
  }
}
