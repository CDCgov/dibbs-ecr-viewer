interface Address {
  use: "home" | "work" | "temp" | "old" | "billing" | undefined;
  type: "postal" | "physical" | "both" | undefined;
  text: string | undefined;
  line: string[] | undefined;
  city: string | undefined;
  district: string | undefined;
  state: string | undefined;
  postal_code: string | undefined;
  country: string | undefined;
  period_start: Date | undefined;
  period_end: Date | undefined;
}

interface Lab {
  uuid: string | undefined;
  test_type: string | undefined;
  test_type_code: string | undefined;
  test_type_system: string | undefined;
  test_result_qualitative: string | undefined;
  test_result_quantitative: number | undefined;
  test_result_units: string | undefined;
  test_result_code: string | undefined;
  test_result_code_display: string | undefined;
  test_result_code_system: string | undefined;
  test_result_interpretation: string | undefined;
  test_result_interpretation_code: string | undefined;
  test_result_interpretation_system: string | undefined;
  test_result_ref_range_low: string | undefined;
  test_result_ref_range_low_units: string | undefined;
  test_result_ref_range_high: string | undefined;
  test_result_ref_range_high_units: string | undefined;
  specimen_type: string | undefined;
  performing_lab: string | undefined;
  specimen_collection_date: Date | undefined;
}

interface ruleSummary {
  summary: string;
}

interface RR {
  condition: string;
  rule_summaries: ruleSummary[];
}

export interface BundleExtendedMetadata {
  patient_id: string;
  person_id: string;
  gender: string | undefined;
  race: string | undefined;
  ethnicity: string | undefined;
  patient_addresses: Address[] | undefined;
  latitude: number | undefined;
  longitude: number | undefined;
  rr_id: string | undefined;
  processing_status: string | undefined;
  eicr_set_id: string | undefined;
  eicr_id: string;
  eicr_version_number: string;
  replaced_eicr_id: string | undefined;
  replaced_eicr_version: string | undefined;
  authoring_datetime: Date | undefined;
  provider_id: string | undefined;
  facility_id_number: string | undefined;
  facility_name: string | undefined;
  facility_type: string | undefined;
  encounter_type: string | undefined;
  encounter_start_date: Date | undefined;
  encounter_end_date: Date | undefined;
  reason_for_visit: string | undefined;
  active_problems: string[] | undefined;
  labs: Lab[] | undefined;
  birth_sex: string | undefined;
  gender_identity: string | undefined;
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
  ecr_id: string;
  last_name: string | undefined;
  first_name: string | undefined;
  birth_date: Date | undefined;
  rr: RR[] | undefined;
  report_date: Date | undefined;
}
export interface BundleMetadata {
  last_name: string;
  first_name: string;
  birth_date: string;
  data_source: string;
  eicr_set_id: string | undefined;
  eicr_version_number: string | undefined;
  rr: RR[] | undefined;
  report_date: string;
}
