import "server-only";
import { randomUUID } from "node:crypto";

import { Transaction } from "kysely";

import { getDb } from "@/app/data/metadataDb/database";
import {
  ConditionReference,
  Core,
  ProgramArea,
} from "@/app/data/metadataDb/types/core";
import { stringSort } from "@/app/utils/format-utils";

import { audit } from "./auditLogService";
import { UserFacingError } from "./errorService";
import { getCheckAdmin } from "./userService";

/**
 * Create a program area with the given name. The currently logged in user
 * must be an admin and not actively exist, otherwise an error will be throw.
 * @param name Name of the program area to add. Must be unique (DB enforced).
 * @param conditions list of condition codes to associate with the program area
 * @returns UUID of the created program area
 */
export const createProgramArea = audit(
  "program_area",
  "create",
  async (
    {
      name,
      conditions,
    }: {
      name: string;
      conditions: string[];
    },
    trx: Transaction<Core>,
  ): Promise<string> => {
    const creatingUser = await getCheckAdmin("create program areas");

    if (name.trim().length < 2 || conditions.length === 0) {
      throw new UserFacingError(
        "Invalid program area. Must have a non-empty name and at least one condition assigned.",
      );
    }

    try {
      const uuid = randomUUID();
      await checkDupeName(trx, name, uuid);
      await trx
        .insertInto("program_area")
        .values({ uuid, author_uuid: creatingUser.uuid, name })
        .execute();

      await trx
        .updateTable("condition_reference")
        .set({ program_area_uuid: uuid })
        .where("code", "in", conditions)
        .execute();

      return uuid;
    } catch (error: unknown) {
      let message = "Failed to create program area";
      if (error instanceof UserFacingError) {
        message = `${message}. ${error.message}`;
      }
      console.error({ message, error });
      throw new UserFacingError(message);
    }
  },
);

const checkDupeName = async (
  db: Transaction<Core>,
  name: string,
  uuid: string,
) => {
  const dupe = await db
    .selectFrom("program_area")
    .selectAll()
    .where((eb) =>
      eb(eb.fn<string>("LOWER", [eb.ref("name")]), "=", name.toLowerCase()),
    )
    .where("uuid", "!=", uuid)
    .executeTakeFirst();

  if (!!dupe) {
    throw new UserFacingError("This program area name already exists.");
  }
};

/**
 * Get program area with the given uuid
 * @param uuid id of the program to get
 * @returns program area if available, otherwise undefined
 */
export const getProgramArea = async (
  uuid: string,
): Promise<ProgramArea | undefined> => {
  try {
    return await getDb<Core>()
      .selectFrom("program_area")
      .selectAll()
      .where("program_area.uuid", "=", uuid)
      .executeTakeFirst();
  } catch (error: unknown) {
    const message = "Failed to get program area";
    console.error({ message, error });
    throw new Error(message);
  }
};

/**
 * Update a program with the the given uuid.
 * @param uuid (current) id of the program area to update
 * @param updates object with fields to update in the record.
 * @param updates.name string of the new name for the program. Optional.
 * @param updates.conditions list of condition codes to associate with the program (must be full
 * list - if an empty list is passed, the program will have no conditions associated after this call). Optional.
 */
export const updateProgramArea = audit(
  "program_area",
  "update",
  async (
    {
      uuid,
      name,
      conditions,
    }: {
      uuid: string;
      name?: string;
      conditions?: string[];
    },
    trx: Transaction<Core>,
  ): Promise<void> => {
    await getCheckAdmin("update program areas");

    try {
      await checkDupeName(trx, name, uuid);
      if (!!name) {
        await trx
          .updateTable("program_area")
          .set({ name })
          .where("uuid", "=", uuid)
          .execute();
      }

      if (!!conditions) {
        await trx
          .updateTable("condition_reference")
          .set({ program_area_uuid: null })
          .where("program_area_uuid", "=", uuid)
          .execute();

        // Then assign the new ones, if any
        if (conditions.length > 0) {
          await trx
            .updateTable("condition_reference")
            .set({ program_area_uuid: uuid })
            .where("code", "in", conditions)
            .execute();
        }
      }
    } catch (error: unknown) {
      let message = "Failed to update program area";
      if (error instanceof UserFacingError) {
        message = `${message}. ${error.message}`;
      }
      console.error({ message, error });
      throw new UserFacingError(message);
    }
  },
);

/**
 * Delete program area by id and remove any references in the conditions table.
 * The deleting user must be an admin.
 * @param uuid id of the program area to delete
 */
export const deleteProgramArea = audit(
  "program_area",
  "delete",
  async ({ uuid }: { uuid: string }, trx: Transaction<Core>): Promise<void> => {
    await getCheckAdmin("delete program areas");

    try {
      await trx
        .updateTable("condition_reference")
        .set({ program_area_uuid: null })
        .where("program_area_uuid", "=", uuid)
        .execute();

      await trx
        .deleteFrom("user_program_area")
        .where("program_area_uuid", "=", uuid)
        .execute();

      await trx.deleteFrom("program_area").where("uuid", "=", uuid).execute();
    } catch (error: unknown) {
      const message = "Failed to delete program area";
      console.error({ message, error });
      throw new UserFacingError(message);
    }
  },
);

export type ListedProgramArea = ProgramArea & {
  conditions: (ConditionReference & { is_duplicate: boolean })[];
};

/**
 * List program areas. The logged in user must be an admin.
 * @returns list of all program areas
 */
export const listProgramAreas = async (): Promise<ListedProgramArea[]> => {
  await getCheckAdmin("list program areas");

  try {
    return await getDb<Core>()
      .transaction()
      .execute(async (db) => {
        const programAreas = await db
          .selectFrom("program_area")
          .selectAll()
          .execute();
        const conditionRefs = await db
          .selectFrom("condition_reference")
          .selectAll()
          .execute();

        const conditions = conditionRefs
          .map((c) => ({
            ...c,
            is_duplicate: conditionRefs.some(
              ({ condition_name, code }) =>
                c.condition_name === condition_name && c.code !== code,
            ),
          }))
          .sort((a, b) => stringSort(a.condition_name, b.condition_name));

        return programAreas
          .map((pa) => ({
            ...pa,
            conditions: conditions.filter(
              ({ program_area_uuid }) => program_area_uuid === pa.uuid,
            ),
          }))
          .sort((a, b) => stringSort(a.name, b.name));
      });
  } catch (error: unknown) {
    const message = "Failed to list program areas";
    console.error({ message, error });
    throw new UserFacingError(message);
  }
};
