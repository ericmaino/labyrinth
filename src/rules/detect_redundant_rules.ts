import {nopSimplifier, Simplifier} from '../setops';

import {RuleSpec} from './ruleSpec';
import {Rule} from './rule';
import {Evaluator} from './types';

export function detectRedundantRules(
  evaluator: Evaluator<RuleSpec>,
  rules: Rule[],
  simplify: Simplifier<RuleSpec> = nopSimplifier
): RuleSpec[] {
  const redundant: RuleSpec[] = [];

  const baseline = evaluator(rules, simplify);
  for (let i = 0; i < rules.length; ++i) {
    const filtered = rules.filter((rule, index) => index !== i);
    // console.log(`Checking ${filtered.map(x => x.spec.id)}`);
    const other = evaluator(filtered, simplify);

    const baselineSubOther = baseline.subtract(other, simplify);
    if (!baselineSubOther.isEmpty()) {
      continue;
    }

    const otherSubBaseline = other.subtract(baseline, simplify);
    if (otherSubBaseline.isEmpty()) {
      redundant.push(rules[i].spec);
    }
  }

  return redundant;
}
