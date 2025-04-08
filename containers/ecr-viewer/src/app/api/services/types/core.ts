import { Insertable, Selectable, Updateable } from "kysely";

import { Common, ecr_data } from "./common";

export type CoreECR = Selectable<ecr_data>;
export type NewCoreECR = Insertable<ecr_data>;
export type CoreECRUpdate = Updateable<ecr_data>;

export interface Core extends Common {}
