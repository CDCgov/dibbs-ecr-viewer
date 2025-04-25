import { ColumnType, Generated, Insertable, Selectable } from "kysely";

export interface ecr_data {
  eicr_id: Generated<string>;
  set_id: string;
  eicr_version_number: string | undefined;
  fhir_reference_link: string | undefined;
  date_created: Generated<Date>;
  last_name: string | undefined;
  first_name: string | undefined;
  birth_date: ColumnType<Date, string> | undefined;
  encounter_start_date: Date | undefined;
}

export interface ecr_rr_conditions {
  uuid: Generated<string>;
  eicr_id: string;
  condition: string;
}

export interface ecr_rr_rule_summaries {
  uuid: Generated<string>;
  ecr_rr_conditions_id: string;
  rule_summary: string;
}

export type CoreECR = Selectable<ecr_data>;
export type NewCoreECR = Insertable<ecr_data>;

export type ECRConditions = Selectable<ecr_rr_conditions>;
export type NewECRConditions = Insertable<ecr_rr_conditions>;

export type ECRRuleSummaries = Selectable<ecr_rr_rule_summaries>;
export type NewECRRuleSummaries = Insertable<ecr_rr_rule_summaries>;

export interface Core {
  ecr_data: ecr_data;
  ecr_rr_conditions: ecr_rr_conditions;
  ecr_rr_rule_summaries: ecr_rr_rule_summaries;
}
