import { db } from './database'
import { ECR, NewECR, ECRUpdate } from './types'

export async function findEcrById(id: string) {
  return await db.selectFrom('ecr_data')
    .where('eICR_ID', '=', id)
    .selectAll()
    .executeTakeFirst()
}

export async function findEcr(criteria: Partial<ECR>) {
  let query = db.selectFrom('ecr_data')

  if (criteria.eICR_ID) {
    query = query.where('eICR_ID', '=', criteria.eICR_ID)
  }

  if (criteria.set_id) {
    query = query.where('set_id', '=', criteria.set_id)
  }

  if (criteria.data_source) {
    query = query.where('data_source', '=', criteria.data_source)
  }

  if (criteria.fhir_reference_link) {
    query = query.where('fhir_reference_link', '=', criteria.fhir_reference_link)
  }

  if (criteria.patient_name_last !== undefined) {
    query = query.where(
      'patient_name_last',
      criteria.patient_name_last === null ? 'is' : '=',
      criteria.patient_name_last
    )
  }

  if (criteria.patient_birth_date) {
    query = query.where('patient_birth_date', '=', criteria.patient_birth_date)
  }

  if (criteria.date_created) {
    query = query.where('date_created', '=', criteria.date_created)
  }

  return await query.selectAll().execute()
}

export async function createEcr(ecr: NewECR) {
  return await db.insertInto('ecr_data')
    .values(ecr)
    .returningAll()
    .executeTakeFirstOrThrow()
}

export async function updateEcr(eICR_ID: string, updateWith: ECRUpdate) {
    await db.updateTable('ecr_data').set(updateWith).where('eICR_ID', '=', eICR_ID).execute()
}

export async function deleteEcr(eICR_ID: string) {
  const ecr = await findEcrById(eICR_ID)

  if (ecr) {
    await db.deleteFrom('ecr_data').where('eICR_ID', '=', eICR_ID).execute()
  }

  return ecr
}