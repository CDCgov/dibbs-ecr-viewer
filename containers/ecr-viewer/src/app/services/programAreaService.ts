import "server-only";
import { randomUUID } from "node:crypto";

import { Transaction } from "kysely";

import { USER_TYPE } from "@/app/constants";
import { getDb } from "@/app/data/metadataDb/database";
import {
  ConditionReference,
  Core,
  ProgramArea,
} from "@/app/data/metadataDb/types/core";
import { stringSort } from "@/app/utils/format-utils";

import { audit } from "./auditLogService";
import { UserFacingError } from "./errorService";
import { listAdminConditionReferencesQuery } from "./listConditionsService";
import {
  getCheckAdmin,
  getCheckAnyAdmin,
  isAdmin,
  listUserProgramAreasQuery,
} from "./userService";

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
 * Validate admins permissions to manage conditions.
 * Full admins and empty condition lists pass validation by default.
 *
 * @param user User whose access should be validated.
 * @param conditions Condition codes the user is attempting to manage.
 * @param trx Transaction used to query the user's accessible conditions.
 * @throws {UserFacingError} If an admin includes an inaccessible condition.
 */
export const validateAdminConditionAccess = async (
  user: Awaited<ReturnType<typeof getCheckAnyAdmin>>,
  conditions: string[],
  trx: Transaction<Core>,
): Promise<void> => {
  if (isAdmin(user) || conditions.length === 0) return;

  const accessibleConditions = await listAdminConditionReferencesQuery(
    user,
    trx,
    conditions,
  );

  const accessibleCodes = new Set(accessibleConditions.map(({ code }) => code));
  if (conditions.some((code) => !accessibleCodes.has(code))) {
    throw new UserFacingError(
      "Program admins cannot manage conditions outside of their program areas.",
    );
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
    const updatingUser = await getCheckAnyAdmin("update program areas");
    const updatingUserUuid = updatingUser.uuid;

    try {
      if (!isAdmin(updatingUser)) {
        const accessibleProgramArea = await trx
          .selectFrom("user_program_area")
          .select("program_area_uuid")
          .where("user_uuid", "=", updatingUserUuid)
          .where("program_area_uuid", "=", uuid)
          .executeTakeFirst();

        if (!accessibleProgramArea) {
          throw new UserFacingError(
            "Program admins cannot manage program areas they are not assigned to.",
          );
        }
      }

      if (!!name) {
        if (!isAdmin(updatingUser)) {
          const currentProgramArea = await trx
            .selectFrom("program_area")
            .select("name")
            .where("uuid", "=", uuid)
            .executeTakeFirst();

          if (currentProgramArea?.name !== name) {
            throw new UserFacingError(
              "Program admins cannot update program area names.",
            );
          }
        }

        await checkDupeName(trx, name, uuid);
        await trx
          .updateTable("program_area")
          .set({ name })
          .where("uuid", "=", uuid)
          .execute();
      }

      if (!!conditions) {
        await validateAdminConditionAccess(updatingUser, conditions, trx);
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
 * List program areas. The logged in user must be an admin or a program admin.
 * @param options Function options
 * @param options.userUuids If provided, list program areas for these visible users
 * @returns list of all program areas
 */
export const listProgramAreas = async (
  options: { userUuids?: string[] } = {},
): Promise<ListedProgramArea[]> => {
  const user = await getCheckAnyAdmin("list program areas");

  try {
    return await getDb<Core>()
      .transaction()
      .execute(async (db) => {
        const programAreas =
          options.userUuids !== undefined
            ? await getProgramAreasForUserDetails(db, options.userUuids)
            : user.user_type === USER_TYPE.ADMIN
              ? await db.selectFrom("program_area").selectAll().execute()
              : await listUserProgramAreasQuery(db, user.uuid);
        return addConditionsToProgramAreas(db, programAreas);
      });
  } catch (error: unknown) {
    const message = "Failed to list program areas";
    console.error({ message, error });
    throw new UserFacingError(message);
  }
};

const getProgramAreasForUserDetails = async (
  db: Transaction<Core>,
  userUuids: string[],
): Promise<ProgramArea[]> => {
  if (userUuids.length === 0) return [];

  return db
    .selectFrom("program_area")
    .innerJoin(
      "user_program_area",
      "program_area.uuid",
      "user_program_area.program_area_uuid",
    )
    .selectAll("program_area")
    .where("user_program_area.user_uuid", "in", userUuids)
    .distinct()
    .execute();
};

const addConditionsToProgramAreas = async (
  db: Transaction<Core>,
  programAreas: ProgramArea[],
): Promise<ListedProgramArea[]> => {
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
};
