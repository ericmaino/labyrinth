import DRange from 'drange';
import * as t from 'io-ts';

import {Conjunction, DimensionedRange} from '../setops';

import {DimensionType} from './dimension_type';

// TODO: consider making IdGenerator into a function.
export class IdGenerator {
  private nextId = 1;

  constructor(startId = 1) {
    this.nextId = startId;
  }

  next() {
    return this.nextId++;
  }
}

export const DimensionSpecType = t.type({
  name: t.string,
  key: t.string,
  type: t.string,
});
export type DimensionSpec = t.TypeOf<typeof DimensionSpecType>;

export type DimensionFormatter = (r: DRange) => string;

export class Dimension {
  private static idGenerator = new IdGenerator();

  readonly name: string;
  readonly key: string;
  readonly type: DimensionType;
  readonly id: number;

  // DESIGN NOTE: optional idGenerator is provided to simplify unit tests.
  // Without the default idGenerator, many unit tests would have to be modified
  // to pass an IdGenerator.
  constructor(
    name: string,
    key: string,
    type: DimensionType,
    idGenerator?: IdGenerator
  ) {
    this.name = name;
    // TODO: IMPLEMENT
    // TODO: check for key collision with Rule: action, priority
    // TODO: check for illegal key
    //   https://stackoverflow.com/questions/1661197/what-characters-are-valid-for-javascript-variable-names/9337047#9337047
    //   https://mathiasbynens.be/notes/javascript-identifiers-es6
    this.key = key;
    this.type = type;
    this.id = (idGenerator || Dimension.idGenerator).next();
  }

  parse(text: string): Conjunction {
    const range = this.type.parser(text);

    // DESIGN NOTE: passing empty rules list because parser is only intended
    // to be used in contexts where rules list is known, e.g. parseRuleSpec().
    return Conjunction.create([new DimensionedRange(this, range)], new Set<number>());
  }
}