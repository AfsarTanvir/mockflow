import { Exception } from '@adonisjs/core/exceptions';
import type { Infer } from '@vinejs/vine/types';
import ScenarioRule from '#models/scenario_rule';
import * as AccessService from '#services/access_service';
import * as cache from '#services/cache_service';
import * as RuleQueries from '#queries/rule_queries';
import { validateRuleCombination } from '#validators/rule_validator';
import type { createRuleValidator, updateRuleValidator } from '#validators/rule_validator';

export type CreateRuleInput = Infer<typeof createRuleValidator>;
export type UpdateRuleInput = Infer<typeof updateRuleValidator>;

/** List a scenario's rules. Viewer+. */
export async function listForScenario(scenarioId: string, userId: string) {
  await AccessService.assertScenarioAccess(scenarioId, userId, 'viewer');
  return RuleQueries.listForScenario(scenarioId);
}

/** Create a rule. Member+. Enforces the operator/value combination. */
export async function createRule(
  scenarioId: string,
  userId: string,
  input: CreateRuleInput
): Promise<ScenarioRule> {
  const { scenario, project } = await AccessService.assertScenarioAccess(
    scenarioId,
    userId,
    'member'
  );

  const combinationError = validateRuleCombination(input.operator, input.value);
  if (combinationError) {
    throw new Exception(combinationError, { status: 422, code: 'E_RULE_COMBINATION' });
  }

  const rule = await ScenarioRule.create({
    scenarioId: scenario.id,
    source: input.source,
    field: input.field,
    operator: input.operator,
    value: input.operator === 'exists' ? null : (input.value ?? null),
  });
  await cache.invalidateMock(project.id);
  return rule;
}

/** Update a rule. Member+. Re-validates the operator/value combination. */
export async function updateRule(
  ruleId: string,
  userId: string,
  input: UpdateRuleInput
): Promise<ScenarioRule> {
  const { rule, project } = await AccessService.assertRuleAccess(ruleId, userId, 'member');

  const finalOperator = input.operator ?? rule.operator;
  const finalValue = input.value !== undefined ? input.value : rule.value;
  const combinationError = validateRuleCombination(finalOperator, finalValue);
  if (combinationError) {
    throw new Exception(combinationError, { status: 422, code: 'E_RULE_COMBINATION' });
  }

  rule.merge({
    ...(input.source !== undefined && { source: input.source }),
    ...(input.field !== undefined && { field: input.field }),
    ...(input.operator !== undefined && { operator: input.operator }),
    ...(input.value !== undefined && { value: input.value }),
  });

  // Normalize: an 'exists' rule never carries a value.
  if (rule.operator === 'exists') {
    rule.value = null;
  }
  await rule.save();
  await cache.invalidateMock(project.id);

  return rule;
}

/** Delete a rule. Member+. */
export async function deleteRule(ruleId: string, userId: string): Promise<void> {
  const { rule, project } = await AccessService.assertRuleAccess(ruleId, userId, 'member');
  await rule.delete();
  await cache.invalidateMock(project.id);
}
