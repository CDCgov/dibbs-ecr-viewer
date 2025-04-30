import "server-only";
import { randomUUID } from "node:crypto";

import { getDb } from "@/app/data/metadataDb/database";
import { Core } from "@/app/data/metadataDb/types/core";

import { getCheckAdmin } from "./userService";

/**
 * Create a program area with the given name. The currently logged in user
 * must be an admin and not actively exist, otherwise an error will be throw.
 * @param name Name of the program area to add. Must be unique.
 * @returns UUID of the created program area
 */
export const createProgramArea = async (name: string): Promise<string> => {
  const creatingUser = await getCheckAdmin("create program areas");

  try {
    const uuid = randomUUID();
    await getDb<Core>()
      .insertInto("program_area")
      .values({ uuid, author_uuid: creatingUser.uuid, name })
      .execute();
    return uuid;
  } catch (error: unknown) {
    const message = "Failed to create program area";
    console.error({ message, error });
    throw new Error(message);
  }
};

/**
 * Update a user with the the given email.
 * @param uuid (current) email of the user to update
 * @param updates objecct with fields to update in their record. UUID fields should not be updated.
 * @param updates.name string of the new name for the program. Optional.
 * @param updates.conditions list of condition codes to associate with the program (must be full list). Optional.
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
            .where("program_area_uuid", "=", "uuid")
            .execute();
          for (const condition of conditions) {
            await db
              .updateTable("condition_reference")
              .set({ program_area_uuid: uuid })
              .where("code", "=", condition)
              .execute();
          }
        }
      });
  } catch (error: unknown) {
    const message = "Failed to update user";
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
        await db.deleteFrom("program_area").where("uuid", "=", uuid).execute();
      });
  } catch (error: unknown) {
    const message = "Failed to delete program area";
    console.error({ message, error });
    throw new Error(message);
  }
};

/**
 * List all active users. The logged in user must be an admin.
 * @returns list of all active users
 */
// export const listUsers = async (): Promise<User[]> => {
//   const listingUser = await getLoggedInUser();
//   if (!isAdmin(listingUser)) {
//     throw new Error("Standard user cannot list users");
//   }

//   try {
//     return await listActiveUsersQuery();
//   } catch (error: unknown) {
//     const message = "Failed to list users";
//     console.error({ message, error });
//     throw new Error(message);
//   }
// };

// const listActiveUsersQuery = async () => {
//   return await getDb<Core>()
//     .selectFrom("user")
//     .selectAll()
//     .where("status", "=", "active")
//     .orderBy("email")
//     .execute();
// };
