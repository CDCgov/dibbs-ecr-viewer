import { sql } from 'kysely'
import { db } from '../api/services/database'
import * as extended_database_repo from '../api/services/extended_database_repo'

// patient_address
describe('patient_address', () => {
  beforeAll(async () => {
    await db.schema.createTable('patient_address')
      .addColumn('uuid', 'varchar(200)', (cb) => cb.primaryKey())
      .addColumn('use', 'varchar(7)')
      .addColumn('type', 'varchar(8)')
      .addColumn('text', 'varchar')
      .addColumn('line', 'varchar(255)')
      .addColumn('city', 'varchar(255)')
      .addColumn('district', 'varchar(255)')
      .addColumn('state', 'varchar(255)')
      .addColumn('postal_code', 'varchar(20)')
      .addColumn('country', 'varchar(255)')
      .addColumn('period_start', 'date')
      .addColumn('period_end', 'date')
      .addColumn('eICR_ID', 'varchar(200)')
      .execute()
  })

  afterAll(async () => {
    await db.schema.dropTable('patient_address').execute()
  })

  it('should find an address with a given uuid', async () => {
    await extended_database_repo.findAddressById("12345")
  })

  it('should find all registered addresses within a given city', async () => {
    await extended_database_repo.findAddress({ city: 'Coruscant' })
  })

  it('should update the address with a given id', async () => {
    await extended_database_repo.updateAddress("12345", { city: 'Mustafar' })
  })

  it('should create an address', async () => {
    await extended_database_repo.createAddress({
      uuid: '12345',
      use: 'home',
      type: 'postal',
      text: '1234 Main St',
      line: 'Apt 2',
      city: 'Coruscant',
      district: 'Galactic City',
      state: 'Coruscant',
      postal_code: '12345',
      country: 'Republic',
      period_start: '2025-01-01',
      period_end: '2025-02-07',
      eICR_ID: '12345'
    })
  })

  it('should delete an address with a given id', async () => {
    await extended_database_repo.deleteAddress("12345")
  })
})