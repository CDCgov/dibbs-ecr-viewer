import "server-only";
import { randomUUID } from "node:crypto";

import { getDb } from "@/app/data/metadataDb/database";
import {
  ConditionReference,
  Core,
  ProgramArea,
} from "@/app/data/metadataDb/types/core";

import { getCheckAdmin } from "./userService";

/**
 * Create a program area with the given name. The currently logged in user
 * must be an admin and not actively exist, otherwise an error will be throw.
 * @param name Name of the program area to add. Must be unique (DB enforced).
 * @param conditions list of condition codes to associate with the program area
 * @returns UUID of the created program area
 */
export const createProgramArea = async (
  name: string,
  conditions: string[],
): Promise<string> => {
  const creatingUser = await getCheckAdmin("create program areas");

  if (name.trim().length < 2 || conditions.length === 0) {
    throw new Error(
      "Invalid program. Must have a non-empty name and at least one condition assigned.",
    );
  }

  try {
    const uuid = randomUUID();
    await getDb<Core>()
      .transaction()
      .execute(async (db) => {
        await db
          .insertInto("program_area")
          .values({ uuid, author_uuid: creatingUser.uuid, name })
          .execute();

        if (conditions.length > 0) {
          await db
            .updateTable("condition_reference")
            .set({ program_area_uuid: uuid })
            .where("code", "in", conditions)
            .execute();
        }
      });

    return uuid;
  } catch (error: unknown) {
    const message = "Failed to create program area";
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
export const updateProgramArea = async (
  uuid: string,
  { name, conditions }: { name?: string; conditions?: string[] },
): Promise<void> => {
  await getCheckAdmin("update program areas");

  try {
    await getDb<Core>()
      .transaction()
      .execute(async (db) => {
        if (!!name) {
          await db
            .updateTable("program_area")
            .set({ name })
            .where("uuid", "=", uuid)
            .execute();
        }

        if (!!conditions) {
          await db
            .updateTable("condition_reference")
            .set({ program_area_uuid: null })
            .where("program_area_uuid", "=", uuid)
            .execute();
          if (conditions.length > 0) {
            await db
              .updateTable("condition_reference")
              .set({ program_area_uuid: uuid })
              .where("code", "in", conditions)
              .execute();
          }
        }
      });
  } catch (error: unknown) {
    const message = "Failed to update program area";
    console.error({ message, error });
    throw new Error(message);
  }
};

/**
 * Delete program area by id and remove any references in the conditions table.
 * The deleting user must be an admin.
 * @param uuid id of the program area to delete
 */
export const deleteProgramArea = async (uuid: string): Promise<void> => {
  await getCheckAdmin("delete program areas");

  try {
    await getDb<Core>()
      .transaction()
      .execute(async (db) => {
        await db
          .updateTable("condition_reference")
          .set({ program_area_uuid: null })
          .where("program_area_uuid", "=", uuid)
          .execute();

        await db
          .deleteFrom("user_program_area")
          .where("program_area_uuid", "=", uuid)
          .execute();

        await db.deleteFrom("program_area").where("uuid", "=", uuid).execute();
      });
  } catch (error: unknown) {
    const message = "Failed to delete program area";
    console.error({ message, error });
    throw new Error(message);
  }
};

export type ListedProgramArea = ProgramArea & {
  conditions: ConditionReference[];
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
        return programAreas.map((pa) => ({
          ...pa,
          conditions: conditionRefs.filter(
            ({ program_area_uuid }) => program_area_uuid === pa.uuid,
          ),
        }));
      });
  } catch (error: unknown) {
    const message = "Failed to list program areas";
    console.error({ message, error });
    throw new Error(message);
  }
};
