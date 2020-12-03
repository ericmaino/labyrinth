import {Conjunction} from './conjunction';
import {FormattingOptions} from './formatting';
import {setopsTelemetry, Snapshot, Telemetry} from './telemetry';

export class Disjunction {
  conjunctions: Conjunction[];

  static create(conjunctions: Conjunction[]) {
    // Simplify conjunction.
    let simplified: Conjunction[] = [];
    for (const c of conjunctions) {
      if (c.isUniverse()) {
        // X | 1 = 1
        simplified = [c];
        break;
      } else if (!c.isEmpty()) {
        // X | 0 = X
        simplified.push(c);
      }
    }

    return new Disjunction(simplified);
  }

  private constructor(conjunctions: Conjunction[]) {
    setopsTelemetry.increment('Disjunction');
    this.conjunctions = conjunctions;
  }

  isEmpty(): boolean {
    return this.conjunctions.length === 0;
  }

  isUniverse(): boolean {
    return this.conjunctions.length === 1 && this.conjunctions[0].isUniverse();
  }

  intersect(other: Disjunction): Disjunction {
    let terms: Conjunction[] = [];
    for (const t1 of this.conjunctions) {
      for (const t2 of other.conjunctions) {
        const t = t1.intersect(t2);
        if (t.isUniverse()) {
          terms = [t];
          break;
        }

        if (!t.isEmpty()) {
          terms.push(t1.intersect(t2));
        }
      }
    }

    // TODO: consider simplification strategies here.
    // TODO: consider standalone simplifaction routine.

    return new Disjunction(terms);
  }

  union(other: Disjunction): Disjunction {
    let terms = [...this.conjunctions];
    for (const t of other.conjunctions) {
      if (t.isEmpty()) {
        // X + 0 = X
        continue;
      }

      if (t.isUniverse()) {
        // X + 1 = 1
        terms = [t];
        break;
      }

      terms.push(t);

      // TODO: consider other simplification strategies here.
      //   Remove duplicates
    }

    return new Disjunction(terms);
  }

  subtract(other: Disjunction): Disjunction {
    const factors = other.conjunctions.map(x => x.complement());

    // TODO: use reduce
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let result: Disjunction = this;
    for (const f of factors) {
      result = result.intersect(f);
    }

    return result;
  }

  format(options: FormattingOptions = {}) {
    const lines = this.conjunctions.map(c => c.format(options));
    return lines.join('\n\n');
  }

  complexity(): Snapshot {
    const telemetry = new Telemetry();
    const snapshot = new Snapshot(telemetry);

    telemetry.increment('Disjunction');
    for (const c of this.conjunctions) {
      telemetry.increment('Conjunction');
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for (const d of c.dimensions) {
        telemetry.increment('DimensionedRange');
      }
    }

    return snapshot;
  }
}
