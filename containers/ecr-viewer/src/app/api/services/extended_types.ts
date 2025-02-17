import {
    ColumnType,
    Generated,
    Insertable,
    Selectable,
    Updateable,
} from 'kysely'

export interface ecr_data {
   eICR_ID: Generated<string>;
   set_id: string;
   fhir_reference_link: string;
   last_name: string;
   first_name: string;
   birth_date: ColumnType<Date, string | undefined, never>;
   gender: string;
   birth_sex: string;
   gender_identity: string;
   race: string;
   ethnicity: string;
   latitude: number;
   longitude: number;
   homelessness_status: string;
   disabilities: string;
   tribal_affiliation: string;
   tribal_enrollment_status: string;
   current_job_title: string;
   current_job_industry: string;
   usual_occupation: string;
   usual_industry: string;
   preferred_language: string;
   pregnancy_status: string;
   rr_id: string;
   processing_status: string;
   eicr_version_number: string;
   authoring_date: ColumnType<Date, string | undefined, never>;
   authoring_provider: string;
   provider_id: string;
   facility_id: string;
   facility_name: string;
   encounter_type: string;
   encounter_start_date: ColumnType<Date, string | undefined, never>;
   encounter_end_date: ColumnType<Date, string | undefined, never>;
   reason_for_visit: string;
   active_problems: string;
   date_created: ColumnType<Date, string | undefined, never>;
}

export interface patient_address {
   uuid: Generated<string>;
   use: 'home' | 'work' | 'temp' | 'old' | 'billing' | undefined;
   type: 'postal' | 'physical' | 'both' | undefined;
   text: string | undefined;
   line: string | undefined;
   city: string | undefined;
   district: string | undefined;
   state: string | undefined;
   postal_code: string | undefined;
   country: string | undefined;
   period_start: ColumnType<Date, string | undefined, never>;
   period_end: ColumnType<Date, string | undefined, never>;
   eICR_ID: string | null; // Nullable foreign key reference
}

export interface ecr_labs {
   UUID: Generated<string>;
   eICR_ID: string;
   test_type: string;
   test_type_code: string;
   test_type_system: string;
   test_result_qualitative: string;
   test_result_quantitative: number | null;
   test_result_units: string;
   test_result_code: string;
   test_result_code_display: string;
   test_result_code_system: string;
   test_result_interpretation: string;
   test_result_interpretation_code: string;
   test_result_interpretation_system: string;
   test_result_reference_range_low_value: number | null;
   test_result_reference_range_low_units: string;
   test_result_reference_range_high_value: number | null;
   test_result_reference_range_high_units: string;
   specimen_type: string;
   specimen_collection_date: ColumnType<Date, string | undefined, never>;
   performing_lab: string;
} 

export interface ecr_rr_conditions {
   uuid: Generated<string>
   eICR_ID: string
   condition: string
}

export interface ecr_rr_rule_summaries {
   uuid: Generated<string>
   ecr_rr_conditions_id: string
   rule_summary: string
}

export type ExtendedECR = Selectable<ecr_data>
export type NewExtendedECR = Insertable<ecr_data>
export type ExtendedECRUpdate = Updateable<ecr_data>

export type PatientAddress = Selectable<patient_address>
export type NewPatientAddress = Insertable<patient_address>
export type PatientAddressUpdate = Updateable<patient_address>

export type EcrLabs = Selectable<ecr_labs>
export type NewEcrLabs = Insertable<ecr_labs>
export type EcrLabsUpdate = Updateable<ecr_labs>

export type ECRConditions = Selectable<ecr_rr_conditions>
export type NewECRConditions = Insertable<ecr_rr_conditions>
export type ECRConditionsUpdate = Updateable<ecr_rr_conditions>

export type ECRRuleSummaries = Selectable<ecr_rr_rule_summaries>
export type NewECRRuleSummaries = Insertable<ecr_rr_rule_summaries>
export type ECRRuleSummariesUpdate = Updateable<ecr_rr_rule_summaries>

export interface ExtendedDatabase {
   ecr_data: ecr_data
   patient_address: patient_address
   ecr_labs: ecr_labs
   ecr_rr_conditions: ecr_rr_conditions
   ecr_rr_rule_summaries: ecr_rr_rule_summaries
}