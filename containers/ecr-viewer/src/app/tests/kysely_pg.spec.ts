import { sql } from 'kysely'
import { db } from '../api/services/database'
import * as ecr_data_repo from '../api/services/ecr_data_repo'

describe('ecr_data_repo', () => {
  beforeAll(async () => {
    await db.schema.createTable('ecr_data')
      .addColumn('eICR_ID', 'varchar(200)', (cb) => cb.primaryKey())
      .addColumn('set_id', 'varchar(255)')
      .addColumn('eicr_version_number', 'varchar(50)')
      .addColumn('data_source', 'varchar(2)') // S3 or DB
      .addColumn('fhir_reference_link', 'varchar(500)')
      .addColumn('patient_name_first', 'varchar(100)')
      .addColumn('patient_name_last', 'varchar(100)')
      .addColumn('patient_birth_date', 'date')
      .addColumn('date_created', 'timestamptz', (cb) => cb.notNull().defaultTo(sql`NOW()`))
      .addColumn('report_date', 'date')
      .execute()
  })

  afterAll(async () => {
    await db.schema.dropTable('ecr_data').execute()
  })

  it('should find an ECR with a given eICR_ID', async () => {
    await ecr_data_repo.findEcrById("12345")
  })

  it('should find all people named General', async () => {
    await ecr_data_repo.findEcr({ patient_name_first: 'General' })
  })

  it('should update patient_name_last of a person with a given id', async () => {
    await ecr_data_repo.updateEcr("12345", { patient_name_last: 'Grievous' })
  })

  it('should create an ECR', async () => {
    await ecr_data_repo.createEcr({
      eICR_ID: '12345',
      set_id: 'setid',
      data_source: 'DB',
      fhir_reference_link: 'link',
      eicr_version_number: '50000',
      patient_name_first: 'Boba',
      patient_name_last: 'Fett',
      patient_birth_date: '1969-02-11',
      date_created: '2025-01-01',
      report_date: '2025-02-07'
    })
  })

  it('should delete an ECR with a given id', async () => {
    await ecr_data_repo.deleteEcr("12345")
  })
})
