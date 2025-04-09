import { ColumnType, Insertable, Selectable, Updateable } from "kysely";

import { Common, ecr_data } from "./common";

export interface core_ecr_data extends ecr_data {
  data_source: "DB" | "S3";

  patient_name_first: string;
  patient_name_last: string;
  patient_birth_date: ColumnType<Date, string>;

  report_date: Date;
}

export type CoreECR = Selectable<core_ecr_data>;
export type NewCoreECR = Insertable<core_ecr_data>;
export type CoreECRUpdate = Updateable<core_ecr_data>;

export interface Core extends Common {
  ecr_data: core_ecr_data;
}
