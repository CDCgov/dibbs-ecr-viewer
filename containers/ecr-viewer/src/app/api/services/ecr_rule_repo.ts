import { db } from './database'
import { ECRRuleSummaries, NewECRRuleSummaries, ECRRuleSummariesUpdate } from './types'

export async function findEcrRuleById(id: string) {
  return await db.selectFrom('ecr_rr_rule_summaries')
    .where('uuid', '=', id)
    .selectAll()
    .executeTakeFirst()
}

export async function findEcrRule(criteria: Partial<ECRRuleSummaries>) {
  let query = db.selectFrom('ecr_rr_rule_summaries')

  if (criteria.uuid) {
    query = query.where('uuid', '=', criteria.uuid)
  }

  if (criteria.ecr_rr_conditions_id) {
    query = query.where('ecr_rr_conditions_id', '=', criteria.ecr_rr_conditions_id)
  }

  if (criteria.rule_summary) {
    query = query.where('rule_summary', '=', criteria.rule_summary)
  }

  return await query.selectAll().execute()
}

export async function createEcrRule(ecr: NewECRRuleSummaries) {
    const compiledQuery = db.insertInto('ecr_rr_rule_summaries').values(ecr).compile()

    const {
      rows: [{ uuid }],
    } = await db.executeQuery<Pick<ECRRuleSummaries, 'uuid'>>({
      ...compiledQuery,
      sql: `${compiledQuery.sql}; select scope_identity() as uuid`,
    })

    return await findEcrRuleById(uuid)
}

export async function updateEcrRule(uuid: string, updateWith: ECRRuleSummariesUpdate) {
    await db.updateTable('ecr_rr_conditions').set(updateWith).where('uuid', '=', uuid).execute()
}

export async function deleteEcrRule(uuid: string) {
  const ecr = await findEcrRuleById(uuid)

  if (ecr) {
    await db.deleteFrom('ecr_rr_rule_summaries').where('uuid', '=', uuid).execute()
  }

   return ecr
}