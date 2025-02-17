import {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from "kysely";

export interface ecr_data {
  eICR_ID: Generated<string>;
  set_id: string;
  data_source: string;
  fhir_reference_link: string;
  eicr_version_number: string;

  patient_name_first: string;
  patient_name_last: string;
  patient_birth_date: ColumnType<Date, string | undefined, never>;

  date_created: ColumnType<Date, string | undefined, never>;
  report_date: ColumnType<Date, string>;
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

export type ECR = Selectable<ecr_data>;
export type NewECR = Insertable<ecr_data>;
export type ECRUpdate = Updateable<ecr_data>;

export type ECRConditions = Selectable<ecr_rr_conditions>;
export type NewECRConditions = Insertable<ecr_rr_conditions>;
export type ECRConditionsUpdate = Updateable<ecr_rr_conditions>;

export type ECRRuleSummaries = Selectable<ecr_rr_rule_summaries>;
export type NewECRRuleSummaries = Insertable<ecr_rr_rule_summaries>;
export type ECRRuleSummariesUpdate = Updateable<ecr_rr_rule_summaries>;

export interface Core {
  ecr_data: ecr_data;
  ecr_rr_conditions: ecr_rr_conditions;
  ecr_rr_rule_summaries: ecr_rr_rule_summaries;
}
