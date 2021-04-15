import DRange from 'drange';
import {SymbolDefinitionSpec} from '.';

export class SymbolStore {
  private readonly symbols: SymbolDefinitionSpec[];

  constructor(...symbols: SymbolDefinitionSpec[]) {
    this.symbols = [];

    if (symbols) {
      for (const symbol of symbols) {
        this.symbols.push(symbol);
      }
    }
  }

  public pushHead(dimension: string, symbol: string, range: string) {
    const spec: SymbolDefinitionSpec = {dimension, symbol, range};
    this.symbols.unshift(spec);
  }

  public push(dimension: string, symbol: string, range: string) {
    const spec: SymbolDefinitionSpec = {dimension, symbol, range};
    this.symbols.push(spec);
  }

  public getSymbolsSpec(): SymbolDefinitionSpec[] {
    return this.symbols;
  }
}

export interface SymbolRange {
  name: string;
  range: DRange;
}

export class SymbolTable {
  private readonly map: Map<string, DRange>;
  private readonly keyIndex: SymbolRange[];
  private initialized = false;

  constructor(map: Map<string, DRange>) {
    this.map = map;
    this.keyIndex = [];
  }

  *[Symbol.iterator](): IterableIterator<SymbolRange> {
    // Need to do a lazy initialize since the intial map is a reference
    // which is empty and will later be populated.
    this.initialize();
    for (const item of this.keyIndex) {
      yield item;
    }
  }

  private initialize() {
    if (!this.initialized) {
      this.initialized = true;

      // Sort from largest set to smallest set to enable
      // the larger sets to be observed and reduced first.
      // This code is still experimental and far from optimal
      const sorted = [...this.map.keys()]
        .map(name => {
          const range = this.map.get(name) ?? new DRange();
          return {name, range};
        })
        .sort((a, b) => b.range.length - a.range.length);

      for (const item of sorted) {
        this.keyIndex.push(item);
      }
    }
  }
}
