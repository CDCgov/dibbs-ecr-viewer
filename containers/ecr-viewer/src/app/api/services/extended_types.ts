import {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from "kysely";

export interface ecr_data {
  eICR_ID: Generated<string>;
  set_id: string | undefined;
  fhir_reference_link: string | null;
  last_name: string | undefined;
  first_name: string | undefined;
  birth_date: ColumnType<Date | undefined>;
  gender: string | undefined;
  birth_sex: string | undefined;
  gender_identity: string | undefined;
  race: string | undefined;
  ethnicity: string | undefined;
  latitude: number | undefined;
  longitude: number | undefined;
  homelessness_status: string | undefined;
  disabilities: string | undefined;
  tribal_affiliation: string | undefined;
  tribal_enrollment_status: string | undefined;
  current_job_title: string | undefined;
  current_job_industry: string | undefined;
  usual_occupation: string | undefined;
  usual_industry: string | undefined;
  preferred_language: string | undefined;
  pregnancy_status: string | undefined;
  rr_id: string | undefined;
  processing_status: string | undefined;
  eicr_version_number: string | undefined;
  authoring_date: ColumnType<Date | undefined>;
  authoring_provider: string | undefined;
  provider_id: string | undefined;
  facility_id: string | undefined;
  facility_name: string | undefined;
  encounter_type: string | undefined;
  encounter_start_date: ColumnType<Date | undefined>;
  encounter_end_date: ColumnType<Date | undefined>;
  reason_for_visit: string | undefined;
  active_problems: string[] | undefined;
  date_created: ColumnType<Date | undefined>;
}

export interface patient_address {
  uuid: Generated<string>;
  use: "home" | "work" | "temp" | "old" | "billing" | undefined;
  type: "postal" | "physical" | "both" | undefined;
  text: string | undefined;
  line: string[] | undefined;
  city: string | undefined;
  district: string | undefined;
  state: string | undefined;
  postal_code: string | undefined;
  country: string | undefined;
  period_start: ColumnType<Date | undefined>;
  period_end: ColumnType<Date | undefined>;
  eICR_ID: string | null; // Nullable foreign key reference
}

export interface ecr_labs {
  uuid: Generated<string>;
  eICR_ID: string;
  test_type: string | undefined;
  test_type_code: string | undefined;
  test_type_system: string | undefined;
  test_result_qualitative: string | undefined;
  test_result_quantitative: number | null;
  test_result_units: string | undefined;
  test_result_code: string | undefined;
  test_result_code_display: string | undefined;
  test_result_code_system: string | undefined;
  test_result_interpretation: string | undefined;
  test_result_interpretation_code: string | undefined;
  test_result_interpretation_system: string | undefined;
  test_result_reference_range_low_value: number | string | null;
  test_result_reference_range_low_units: string | undefined;
  test_result_reference_range_high_value: number | string | null;
  test_result_reference_range_high_units: string | undefined;
  specimen_type: string | undefined;
  specimen_collection_date: ColumnType<Date | undefined>;
  performing_lab: string | undefined;
}

export interface ecr_rr_conditions {
  uuid: Generated<string>;
  eICR_ID: string;
  condition: string;
}

export interface ecr_rr_rule_summaries {
  uuid: Generated<string>;
  ecr_rr_conditions_id: string;
  rule_summary: string;
}

export type ExtendedECR = Selectable<ecr_data>;
export type NewExtendedECR = Insertable<ecr_data>;
export type ExtendedECRUpdate = Updateable<ecr_data>;

export type PatientAddress = Selectable<patient_address>;
export type NewPatientAddress = Insertable<patient_address>;
export type PatientAddressUpdate = Updateable<patient_address>;

export type ECRLabs = Selectable<ecr_labs>;
export type NewECRLabs = Insertable<ecr_labs>;
export type ECRLabsUpdate = Updateable<ecr_labs>;

export type ECRConditions = Selectable<ecr_rr_conditions>;
export type NewECRConditions = Insertable<ecr_rr_conditions>;
export type ECRConditionsUpdate = Updateable<ecr_rr_conditions>;

export type ECRRuleSummaries = Selectable<ecr_rr_rule_summaries>;
export type NewECRRuleSummaries = Insertable<ecr_rr_rule_summaries>;
export type ECRRuleSummariesUpdate = Updateable<ecr_rr_rule_summaries>;

export interface Extended {
  ecr_data: ecr_data;
  patient_address: patient_address;
  ecr_labs: ecr_labs;
  ecr_rr_conditions: ecr_rr_conditions;
  ecr_rr_rule_summaries: ecr_rr_rule_summaries;
}
