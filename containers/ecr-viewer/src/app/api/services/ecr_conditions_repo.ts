import { db } from './database'
import { ECRConditions, NewECRConditions, ECRConditionsUpdate } from './types'

export async function findEcrConditionById(id: string) {
  return await db.selectFrom('ecr_rr_conditions')
    .where('uuid', '=', id)
    .selectAll()
    .executeTakeFirst()
}

export async function findEcrCondition(criteria: Partial<ECRConditions>) {
  let query = db.selectFrom('ecr_rr_conditions')

  if (criteria.uuid) {
    query = query.where('uuid', '=', criteria.uuid)
  }

  if (criteria.eICR_ID) {
    query = query.where('eICR_ID', '=', criteria.eICR_ID)
  }

  if (criteria.condition) {
    query = query.where('condition', '=', criteria.condition)
  }

  return await query.selectAll().execute()
}

export async function createEcrCondition(ecr: NewECRConditions) {
    const compiledQuery = db.insertInto('ecr_rr_conditions').values(ecr).compile()
  
    const {
      rows: [{ uuid }],
    } = await db.executeQuery<Pick<ECRConditions, 'uuid'>>({
      ...compiledQuery,
      sql: `${compiledQuery.sql}; select scope_identity() as uuid`,
    })
  
    return await findEcrConditionById(uuid)
}

export async function updateEcrCondition(uuid: string, updateWith: ECRConditionsUpdate) {
    await db.updateTable('ecr_rr_conditions').set(updateWith).where('uuid', '=', uuid).execute()
}

export async function deleteEcrCondition(uuid: string) {
  const ecr = await findEcrConditionById(uuid)

  if (ecr) {
    await db.deleteFrom('ecr_rr_conditions').where('uuid', '=', uuid).execute()
  }

  return ecr
}