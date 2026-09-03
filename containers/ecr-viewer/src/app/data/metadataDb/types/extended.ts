import { ColumnType, Generated, Insertable, Selectable } from "kysely";

import { Core, ecr_data } from "./core";

export interface extended_ecr_data extends ecr_data {
  gender: string | undefined;
  birth_sex: string | undefined;
  gender_identity: string | undefined;
  race: string | undefined;
  ethnicity: string | undefined;
  homelessness_status: string | undefined;
  tribal_affiliation: string | undefined;
  tribal_enrollment_status: string | undefined;
  current_job_title: string | undefined;
  current_job_industry: string | undefined;
  usual_occupation: string | undefined;
  usual_industry: string | undefined;
  preferred_language: string | undefined;
  pregnancy_status: string | undefined;
  processing_status: string | undefined;
  eicr_version_number: string | undefined;
  authoring_date: Date | undefined;
  authoring_provider: string | undefined;
  provider_id: string | undefined;
  facility_id: string | undefined;
  encounter_type: string | undefined;
  encounter_end_date: Date | undefined;
  reason_for_visit: string | undefined;
  active_problems: string | undefined;
}

export interface patient_address {
  uuid: Generated<string>;
  use: string | undefined;
  line: string | undefined;
  city: string | undefined;
  district: string | undefined;
  state: string | undefined;
  postal_code: string | undefined;
  country: string | undefined;
  period_start: Date | undefined;
  period_end: Date | undefined;
  eicr_id: string | null; // Nullable foreign key reference
}

export interface ecr_labs {
  uuid: Generated<string>;
  eicr_id: string;
  test_type: string | undefined;
  test_type_code: string | undefined;
  test_type_system: string | undefined;
  test_result_qualitative: string | undefined;
  test_result_quantitative: ColumnType<number, string> | null;
  test_result_units: string | undefined;
  test_result_code: string | undefined;
  test_result_code_display: string | undefined;
  test_result_code_system: string | undefined;
  test_result_interpretation: string | undefined;
  test_result_interpretation_code: string | undefined;
  test_result_interpretation_system: string | undefined;
  test_result_reference_range_low_value:
    | ColumnType<number, string>
    | string
    | null;
  test_result_reference_range_low_units: string | undefined;
  test_result_reference_range_high_value: number | string | null;
  test_result_reference_range_high_units: string | undefined;
  performing_lab: string | undefined;
}

export interface ecr_lab_specimens {
  uuid: Generated<string>;
  eicr_id: string;
  lab_uuid: string;
  specimen_type: string | undefined;
  specimen_collection_date: Date | undefined;
}

export interface ecr_immunizations {
  uuid: Generated<string>;
  eicr_id: string;
  name: string | undefined;
  effective_date: Date | undefined;
  status: string | undefined;
  status_reason: string | undefined;
}

export interface ecr_ehr_devices {
  uuid: Generated<string>;
  eicr_id: string;
  ehr_software: string | undefined;
  ehr_manufacturer_model: string | undefined;
}

export type ExtendedECR = Selectable<extended_ecr_data>;
export type NewExtendedECR = Insertable<extended_ecr_data>;

export type PatientAddress = Selectable<patient_address>;
export type NewPatientAddress = Insertable<patient_address>;

export type ECRLabs = Selectable<ecr_labs>;
export type NewECRLabs = Insertable<ecr_labs>;

export type ECRLabSpecimens = Selectable<ecr_lab_specimens>;
export type NewECRLabSpecimens = Insertable<ecr_lab_specimens>;

export type ECRImmunizations = Selectable<ecr_immunizations>;
export type NewECRImmunizations = Insertable<ecr_immunizations>;

export type EcrEhrDevices = Selectable<ecr_ehr_devices>;
export type NewEcrEhrDevices = Insertable<ecr_ehr_devices>;

export interface Extended extends Core {
  ecr_data: extended_ecr_data;
  patient_address: patient_address;
  ecr_labs: ecr_labs;
  ecr_lab_specimens: ecr_lab_specimens;
  ecr_immunizations: ecr_immunizations;
  ecr_ehr_devices: ecr_ehr_devices;
}
