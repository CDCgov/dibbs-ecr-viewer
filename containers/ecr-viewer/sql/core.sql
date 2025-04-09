CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE SCHEMA ecr_viewer;

CREATE TABLE ecr_viewer.ecr_data (
  eicr_id VARCHAR(200) PRIMARY KEY,
  set_id VARCHAR(255),
  eicr_version_number VARCHAR(50),
  data_source VARCHAR(2), -- S3 or DB
  fhir_reference_link VARCHAR(500), -- Link to the ecr fhir bundle
  patient_name_first VARCHAR(100),
  patient_name_last VARCHAR(100),
  patient_birth_date DATE,
  date_created TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  report_date DATE
);

CREATE TABLE ecr_viewer.ecr_rr_conditions (
    uuid VARCHAR(200) PRIMARY KEY,
    eicr_id VARCHAR(200) NOT NULL REFERENCES ecr_viewer.ecr_data(eicr_id),
    condition VARCHAR
);

CREATE TABLE ecr_viewer.ecr_rr_rule_summaries (
    uuid VARCHAR(200) PRIMARY KEY,
    ecr_rr_conditions_id VARCHAR(200) REFERENCES ecr_viewer.ecr_rr_conditions(uuid),
    rule_summary VARCHAR
);
