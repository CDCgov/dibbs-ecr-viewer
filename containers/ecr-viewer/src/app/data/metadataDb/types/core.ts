import { ColumnType, Generated, Insertable, Selectable } from "kysely";

export interface ecr_data {
  eicr_id: string;
  set_id: string;
  eicr_version_number: string | undefined;
  fhir_reference_link: string | undefined;
  date_created: Generated<Date>;
  last_name: string;
  first_name: string;
  birth_date: ColumnType<Date, string>;
  encounter_start_date: Date | undefined;
}

export type CoreECR = Selectable<ecr_data>;
export type NewCoreECR = Insertable<ecr_data>;

export interface ecr_rr_conditions {
  uuid: Generated<string>;
  eicr_id: string;
  condition: string;
}

export type ECRConditions = Selectable<ecr_rr_conditions>;
export type NewECRConditions = Insertable<ecr_rr_conditions>;

export interface ecr_rr_rule_summaries {
  uuid: Generated<string>;
  ecr_rr_conditions_id: string;
  rule_summary: string;
}

export type ECRRuleSummaries = Selectable<ecr_rr_rule_summaries>;
export type NewECRRuleSummaries = Insertable<ecr_rr_rule_summaries>;

export interface user {
  uuid: string;
  email: string;
  name: string | null;
  date_of_last_login: Date | null;
  user_type: string;
  status: Generated<string>;
  date_created: Generated<Date>;
  author_uuid: string;
}

export type User = Selectable<user>;
export type NewUser = Insertable<user>;

export interface program_area {
  uuid: string;
  name: string;
  date_created: Generated<Date>;
  author_uuid: string;
}

export type ProgramArea = Selectable<program_area>;
export type NewProgramArea = Insertable<program_area>;

export interface user_program_area {
  user_uuid: string;
  program_area_uuid: string;
}

export type UserProgramArea = Selectable<user_program_area>;
export type NewUserProgramArea = Insertable<user_program_area>;

export interface condition_reference {
  code: string;
  concept_name: string | null;
  condition_name: string;
  condition_category: string | null;
  program_area_uuid: string | null;
}

export type UserConditionReference = Selectable<condition_reference>;
export type NewUserConditionReference = Insertable<condition_reference>;

export interface Core {
  ecr_data: ecr_data;
  ecr_rr_conditions: ecr_rr_conditions;
  ecr_rr_rule_summaries: ecr_rr_rule_summaries;
  user: user;
  program_area: program_area;
  user_program_area: user_program_area;
  condition_reference: condition_reference;
}
