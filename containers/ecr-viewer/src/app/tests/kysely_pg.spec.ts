import { sql } from 'kysely'
import { db } from '../api/services/database'
import * as ecr_data_repo from '../api/services/ecr_data_repo'

describe('ecr_data_repo', () => {
  beforeAll(async () => {
    await db.schema.createTable('ecr_data')
      .addColumn('eICR_ID', 'varchar(255)', (cb) => cb.primaryKey().modifyEnd(sql`identity`))
      .addColumn('data_source', 'varchar(255)')
      .addColumn('set_id', 'varchar(255)')
      .addColumn('fhir_reference_link', 'varchar(255)')

      .addColumn('patient_name_first', 'varchar(255)')
      .addColumn('patient_name_last', 'varchar(255)')
      .addColumn('patient_birth_date', 'datetime', (cb) => cb.notNull())

      .addColumn('date_created', 'datetime', (cb) => cb.notNull())
      .addColumn('report_date', 'datetime', (cb) =>
        cb.notNull().defaultTo(sql`GETDATE()`)
      )
      .execute()
  })
  
  afterEach(async () => {
    await sql`truncate table ${sql.table('ecr_data')}`.execute(db)
  })
    
  afterAll(async () => {
    await db.schema.dropTable('ecr_data').execute()
  })
    
  it('should find an ECR with a given eICR_ID', async () => {
    await ecr_data_repo.findEcrById("12345")
  })
    
  it('should find all people named Arnold', async () => {
    await ecr_data_repo.findEcr({ patient_name_first: 'General' })
  })
    
  it('should update patient_name_last of a person with a given id', async () => {
    await ecr_data_repo.updateEcr("12345", { patient_name_last: 'Grievous' })
  })
    
  it('should create a ECR', async () => {
    await ecr_data_repo.createEcr({
      patient_name_first: 'Jennifer',
      patient_name_last: 'Aniston',
      patient_birth_date: new Date('1969-02-11'),
      date_created: new Date('2025-01-01'),
    })
  })
    
  it('should delete a person with a given id', async () => {
    await ecr_data_repo.deleteEcr("12345")
  })
})