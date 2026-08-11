import "server-only";
import { randomUUID } from "node:crypto";

import { Kysely, Transaction } from "kysely";
import { notFound } from "next/navigation";

import { getDb } from "@/app/data/metadataDb/database";
import {
  Core,
  NewUser,
  ProgramArea,
  User,
  UserUpdate,
  UserProgramArea,
} from "@/app/data/metadataDb/types/core";
import { USER_TYPE } from "@/app/constants";
import type { UserType } from "@/app/constants";

import { audit } from "./auditLogService";
import { UserFacingError } from "./errorService";
import { getLoggedInUser, getUserByEmail } from "./loggedInUserService";

export type { UserType } from "@/app/constants";

/**
 * @param user User to check is an admin
 * @returns true is the user both exists and is an admin, false otherwise
 */
export const isAdmin = (user: User | undefined): user is User =>
  !!user && user.user_type === USER_TYPE.ADMIN && user.status === "active";

/**
 * @param user User to check is a program admin
 * @returns true if the user both exists and is a program admin, false otherwise
 */
export const isProgramAdmin = (user: User | undefined): user is User =>
  !!user && user.user_type === USER_TYPE.PROG_ADMIN && user.status === "active";

/**
 * @param user User to check is any admin (admin or prog_admin)
 * @returns true if the user both exists and is an admin or program admin, false otherwise
 */
export const isAnyAdmin = (user: User | undefined): user is User =>
  isAdmin(user) || isProgramAdmin(user);

/**
 * If the logged in user is not an admin, force the page calling this to 404.
 */
export const notFoundUnlessAdmin = async () => {
  const admin = await getLoggedInUser();
  if (!isAdmin(admin)) {
    notFound();
  }
};

/**
 * If the logged in user is not an admin or a program admin, force the page calling this to 404.
 */
export const notFoundUnlessAnyAdmin = async () => {
  const user = await getLoggedInUser();
  if (!isAnyAdmin(user)) {
    notFound();
  }
};

/**
 * Check the currently logged in user is an admin and return them. Throws
 * an error if the currently logged in user isn't an admin.
 * @param actionDesc description of the action that only admins can do
 * @returns admin user
 */
export const getCheckAdmin = async (actionDesc: string): Promise<User> => {
  const loggedInUser = await getLoggedInUser();
  if (!isAdmin(loggedInUser)) {
    throw new UserFacingError(
      `Standard user cannot & program admins cannot ${actionDesc}`,
    );
  }

  return loggedInUser;
};

/**
 * Check the currently logged in user is an admin or a program admin and return them.
 * Throws an error if the currently logged in user isn't an admin or a program admin.
 * @param actionDesc description of the action that only admins or program admins can do
 * @returns admin or program admin user
 */
export const getCheckAnyAdmin = async (actionDesc: string): Promise<User> => {
  const loggedInUser = await getLoggedInUser();
  if (!isAnyAdmin(loggedInUser)) {
    throw new UserFacingError(`Standard user cannot ${actionDesc}`);
  }

  return loggedInUser;
};

/**
 * Checks that 1) user has admin or program-level role, and
 * 2) if program-level role, checks they have access to the relevant program area.
 * @param user User to check access for (defaults to logged in user if undefined)
 * @param programAreaUuids UUIDs of the program areas to check
 * @returns whether the user has access to all relevant program areas
 */
export const hasRelevantProgramAreaAccess = async (
  user: User | undefined,
  programAreaUuids: string[],
): Promise<boolean> => {
  const targetUser = user ?? (await getLoggedInUser());
  if (!targetUser || targetUser.status !== "active") {
    return false;
  }

  if (programAreaUuids.length === 0) {
    return true;
  }

  if (targetUser.user_type === USER_TYPE.ADMIN) {
    return true;
  }

  if (
    targetUser.user_type === USER_TYPE.PROG_ADMIN ||
    targetUser.user_type === USER_TYPE.STANDARD
  ) {
    // TODO ANGELA (LATER): Can this use an existing helper function?
    const res = await getDb<Core>()
      .selectFrom("user_program_area")
      .select("user_program_area.program_area_uuid")
      .where("user_uuid", "=", targetUser.uuid)
      .where("program_area_uuid", "in", programAreaUuids)
      .execute();

    const accessibleProgramAreas = new Set(
      res.map(({ program_area_uuid }) => program_area_uuid),
    );

    return programAreaUuids.every((uuid) => accessibleProgramAreas.has(uuid));
  }

  return false;
};

/**
 * Checks whether a target user is active and shares at least one program area
 * with the currently logged-in user.
 * @param targetUserUuid UUID of the target user
 * @returns whether the target user has access relevant to the logged-in user
 */
export const hasRelevantUserAccess = async (
  targetUserUuid: string,
): Promise<boolean> => {
  const targetUser = await getUser(targetUserUuid);
  const [targetProgramAreas, loggedInProgramAreas] = await Promise.all([
    listUserProgramAreas(targetUserUuid),
    listLoggedInUserProgramAreas(),
  ]);
  const hasSharedProgramArea = targetProgramAreas.some(({ uuid }) =>
    loggedInProgramAreas.some(
      ({ uuid: loggedInProgramUuid }) => loggedInProgramUuid === uuid,
    ),
  );

  if (!targetUser || targetUser.status !== "active" || !hasSharedProgramArea) {
    return false;
  }

  return true;
};

// TODO ANGELA: loggedInUser vs targetUserUuid cleanup? email cleanup?
/**
 * Validates whether the logged-in user can create or edit another user's
 * account, role, email, and program area assignments.
 *
 * Admin users bypass all restrictions. Program admins cannot manage admin
 * users, manage users outside their program areas, or modify a user's role or
 * email when editing an existing user.
 *
 * @param loggedInUser - The user performing the user management action.
 * @param userType - The user type being assigned, if provided.
 * @param programs - The program area UUIDs being assigned.
 * @param action - Whether the user is being created or edited.
 * @param targetUserUuid - The UUID of the user being edited, if applicable.
 * @param email - The email being assigned, if provided.
 *
 * @throws {UserFacingError} If a program admin attempts to manage an admin user
 * or a user outside their program areas, or modify a user's role or email while
 * editing.
 * @returns A promise that resolves when the permission checks pass.
 */
export async function validateAdminUserPermissions(
  loggedInUser: User,
  userType: string | undefined,
  programs: string[],
  action: "create" | "edit",
  targetUserUuid?: string,
  email?: string | null,
) {
  if (isAdmin(loggedInUser)) return;

  if (userType === USER_TYPE.ADMIN) {
    throw new UserFacingError("Program admins cannot manage admins.");
  }

  if (targetUserUuid) {
    const hasUserAccess = await hasRelevantUserAccess(targetUserUuid);
    if (!hasUserAccess) {
      throw new UserFacingError(
        "Program admins cannot manage users outside of their program areas.",
      );
    }
  }

  if (action === "edit") {
    if (!!userType || !!email) {
      throw new UserFacingError(
        "Program admins cannot modify user emails or roles.",
      );
    }
  }

  // Program areas
  const hasAccess = await hasRelevantProgramAreaAccess(loggedInUser, programs);
  if (!hasAccess) {
    throw new UserFacingError(
      "Program admins cannot manage users outside of their program areas.",
    );
  }
}

/**
 * Given an ecrId return not found if the user is not authorized to see it.
 * @param ecrId ID of the ecr to authorize
 * @returns whether the logged in user can see this eCR
 */
export const isLoggedInUserEcrAuthed = async (
  ecrId: string,
): Promise<boolean> => {
  const user = await getLoggedInUser();
  if (!user) return false;
  if (user.user_type === USER_TYPE.ADMIN) return true;

  // check standard users permissions
  return await isUserEcrAuthed(user.uuid, ecrId);
};

/**
 * Check whether a given user (by id) is authorized to see an ecr (by ID)
 * @param userId user's uuid
 * @param ecrId eCR's id
 * @returns whether the user is allowed to see the ecr
 */
export const isUserEcrAuthed = async (
  userId: string,
  ecrId: string,
): Promise<boolean> => {
  const res = await getDb<Core>()
    .selectFrom("user_program_area")
    .select("user_program_area.program_area_uuid")
    .where("user_program_area.user_uuid", "=", userId)
    .innerJoin(
      "program_area",
      "user_program_area.program_area_uuid",
      "program_area.uuid",
    )
    .innerJoin(
      "condition_reference",
      "program_area.uuid",
      "condition_reference.program_area_uuid",
    )
    .innerJoin(
      "ecr_rr_conditions",
      "condition_reference.code",
      "ecr_rr_conditions.condition_code",
    )
    .where("ecr_rr_conditions.eicr_id", "=", ecrId)
    .executeTakeFirst();

  return !!res;
};

/**
 * Create a user with the given email and user type. The currently logged in user
 * must be an admin and not actively exist, otherwise an error will be thrown. If
 * exists, but is not active. They will be reactivated with the user type passed.
 * @param params Function parameters
 * @param params.email Email of the user to add
 * @param params.user_type Type of user to create ("admin" or "standard")
 * @param params.programs Array of program areas the user should be assigned to
 * @returns UUID of the created user
 */
export const createUser = audit(
  "user",
  "create",
  async (
    {
      email,
      userType,
      programs,
    }: {
      email: string;
      userType: UserType;
      programs: string[];
    },
    trx: Transaction<Core>,
  ): Promise<string> => {
    const creatingUser = await getCheckAnyAdmin("create new users");
    await validateAdminUserPermissions(
      creatingUser,
      userType,
      programs,
      "create",
    );

    try {
      const uuid = await createUserQuery(
        trx,
        email,
        userType,
        randomUUID(),
        creatingUser.uuid,
      );
      await updateUserProgramAreasQuery(trx, uuid, programs);
      return uuid;
    } catch (error: unknown) {
      const message = "Failed to create new user";
      console.error({ message, error });
      throw new UserFacingError(message);
    }
  },
);

/**
 * Create an initial admin user with the given email. If any active
 * admin already exists, this will do nothing.
 * @param email Email of the user to add
 * @returns UUID of the created user
 */
export const createInitialAdminUser = audit(
  "user",
  "create",
  async (
    { email }: { email: string },
    trx: Transaction<Core>,
  ): Promise<string | undefined> => {
    const users = await listActiveUsersQuery(getDb<Core>());
    if (users.some(({ user_type }) => user_type === USER_TYPE.ADMIN)) {
      console.warn("Active admin user already exists. Skipping user creation.");
      return;
    }

    try {
      const uuid = randomUUID();
      return await createUserQuery(trx, email, USER_TYPE.ADMIN, uuid, uuid);
    } catch (error: unknown) {
      const message = "Failed to create initial admin user";
      console.error({ message, error });
      throw new UserFacingError(message);
    }
  },
);

const createUserQuery = async (
  db: Transaction<Core>,
  email: string,
  user_type: UserType,
  uuid: string,
  author_uuid: string,
) => {
  const user = await getUserByEmail(email);
  if (!!user) {
    if (user.status === "active") {
      throw new UserFacingError("User already exists and is active");
    } else {
      await updateUserQuery(db, user.uuid, { status: "active", user_type });
      return user.uuid;
    }
  }

  const newUser: NewUser = {
    uuid,
    email,
    user_type,
    author_uuid,
  };

  await db.insertInto("user").values(newUser).execute();
  return uuid;
};

/**
 *
 * @param db the database connection
 * @param email email of the user to update (case-insensitive)
 * @param uuid uuid of the user to update
 * @throws UserFacingError when another user with the same email exists
 */
const checkDupeEmail = async (
  db: Transaction<Core>,
  email: string | null | undefined,
  uuid: string,
) => {
  if (!email) {
    return;
  }

  const user = await getUserByEmail(email, db);
  // user does not exist or is this user
  if (!user || user.uuid === uuid) {
    return;
  }

  throw new UserFacingError("Another user with this email already exists.");
};

/**
 * Get a user with the given uuid
 * @param uuid id of the user to get
 * @returns user if available, otherwise undefined
 */
export const getUser = async (uuid: string): Promise<User | undefined> => {
  try {
    return await getDb<Core>()
      .selectFrom("user")
      .selectAll()
      .where("user.uuid", "=", uuid)
      .executeTakeFirst();
  } catch (error: unknown) {
    const message = "Failed to get user";
    console.error({ message, error });
    throw new UserFacingError(message);
  }
};

/**
 * Update a user with the the given id.
 * @param params parameters
 * @param params.uuid id of the user to update
 * @param params.updates object with fields to update in their record. UUID fields should not be updated.
 * @param params.programs array of program areas the user should be assigned to
 */
export const updateUser = audit(
  "user",
  "update",
  async (
    {
      uuid,
      updates,
      programs,
    }: {
      uuid: string;
      updates: Omit<UserUpdate, "uuid" | "author_uuid">;
      programs: string[];
    },
    trx: Transaction<Core>,
  ): Promise<void> => {
    const updatingUser = await getCheckAnyAdmin("update users");
    await validateAdminUserPermissions(
      updatingUser,
      updates.user_type,
      programs,
      "edit",
      uuid,
      updates.email
    );

    try {
      await checkDupeEmail(trx, updates.email, uuid);
      Object.keys(updates).length > 0 &&
        (await updateUserQuery(trx, uuid, updates));

      let programsToUpdate = programs;

      // TODO ANGELA: Refactor? First pass
      if (isProgramAdmin(updatingUser)) {
        // All programs of user being edited
        const existingPrograms = await trx
          .selectFrom("user_program_area")
          .select("program_area_uuid")
          .where("user_uuid", "=", uuid)
          .execute();
        // All programs of program admin
        const updatingUserPrograms = await trx
          .selectFrom("user_program_area")
          .select("program_area_uuid")
          .where("user_uuid", "=", updatingUser.uuid)
          .execute();
        // Made into a set
        const accessibleProgramUuids = new Set(
          updatingUserPrograms.map(
            ({ program_area_uuid }) => program_area_uuid,
          ),
        );

        programsToUpdate = [
          ...new Set([
            // Include programs program admin wants to edit
            ...programs,
            // Keep programs the editor cannot access
            ...existingPrograms
              .filter(
                ({ program_area_uuid }) =>
                  !accessibleProgramUuids.has(program_area_uuid),
              )
              .map(({ program_area_uuid }) => program_area_uuid),
          ]),
        ];
      }

      await updateUserProgramAreasQuery(trx, uuid, programsToUpdate);
    } catch (error: unknown) {
      let message = "Failed to update user";
      if (error instanceof UserFacingError) {
        message = `${message}. ${error.message}`;
      }
      console.error({ message, error });
      throw new UserFacingError(message);
    }
  },
);

const updateUserQuery = async (
  db: Kysely<Core>,
  uuid: string,
  updates: Omit<UserUpdate, "uuid" | "author_uuid">,
) => {
  await db.updateTable("user").set(updates).where("uuid", "=", uuid).execute();
};

/**
 * List the program areas a user is assigned to.
 * @param uuid id of the user
 * @returns list of program areas
 */
export const listUserProgramAreas = async (
  uuid: string,
): Promise<ProgramArea[]> => {
  await getCheckAnyAdmin("list user program areas");
  return listUserProgramAreasQuery(getDb<Core>(), uuid);
};

/**
 * List the program areas the logged in user is assigned to.
 * @returns list of program areas
 */
export const listLoggedInUserProgramAreas = async (): Promise<
  ProgramArea[]
> => {
  const user = await getLoggedInUser();
  return user ? await listUserProgramAreasQuery(getDb<Core>(), user.uuid) : [];
};

export const listUserProgramAreasQuery = async (
  db: Kysely<Core>,
  uuid: string,
): Promise<ProgramArea[]> => {
  try {
    return await db
      .selectFrom(["user_program_area", "program_area"])
      .selectAll(["program_area"])
      .where("user_uuid", "=", uuid)
      .where(({ eb, ref }) =>
        eb("user_program_area.program_area_uuid", "=", ref("uuid")),
      )
      .execute();
  } catch (error: unknown) {
    const message = "Failed to list user program areas";
    console.error({ message, error });
    throw new UserFacingError(message);
  }
};

/**
 * Update a user with the the given id's program areas to the given set.
 * @param trx Kysely transaction
 * @param uuid id of the user to update
 * @param programAreaUuids UUIDs of program areas the user is assigned to.
 */
const updateUserProgramAreasQuery = async (
  trx: Transaction<Core>,
  uuid: string,
  programAreaUuids: string[],
): Promise<void> => {
  await deleteUserProgramAreas(trx, uuid);
  for (const program_area_uuid of programAreaUuids) {
    await trx
      .insertInto("user_program_area")
      .values({ user_uuid: uuid, program_area_uuid })
      .execute();
  }
};

const deleteUserProgramAreas = async (db: Kysely<Core>, uuid: string) => {
  await db
    .deleteFrom("user_program_area")
    .where("user_uuid", "=", uuid)
    .execute();
};

/**
 * Delete user with the given id. The deleting user must be an admin. A
 * user can indeed delete themselves.
 * @param uuid Email of the user to delete
 */
export const deleteUser = audit(
  "user",
  "delete",
  async ({ uuid }: { uuid: string }, trx: Transaction<Core>): Promise<void> => {
    await getCheckAdmin("delete users");

    try {
      await updateUserQuery(trx, uuid, { status: "deleted" });
      await deleteUserProgramAreas(trx, uuid);
    } catch (error: unknown) {
      const message = "Failed to delete user";
      console.error({ message, error });
      throw new UserFacingError(message);
    }
  },
);

export type NamedUserProgramArea = UserProgramArea & { name: string };
export type ListedUser = User & { program_areas: NamedUserProgramArea[] };

/**
 * List active users visible to the logged in admin.
 * @returns list of visible active users
 */
export const listUsers = async (): Promise<ListedUser[]> => {
  const loggedInUser = await getCheckAnyAdmin("list users");

  try {
    return await getDb<Core>()
      .transaction()
      .execute(async (db) => {
        const users = await listActiveUsersQuery(db);
        const userProgramAreas = await db
          .selectFrom("user_program_area")
          .innerJoin(
            "program_area",
            "user_program_area.program_area_uuid",
            "program_area.uuid",
          )
          .select([
            "user_program_area.user_uuid",
            "user_program_area.program_area_uuid",
            "program_area.name",
          ])
          .execute();

        const listedUsers = users.map((user) => ({
          ...user,
          program_areas: userProgramAreas.filter(
            ({ user_uuid }) => user_uuid === user.uuid,
          ),
        }));

        const loggedInUserUuid = loggedInUser.uuid;

        // Admins will see all users
        if (isAdmin(loggedInUser)) return listedUsers;

        // Program admins can only see non-admin users who share at least one
        // of their program areas.
        const accessibleProgramAreaUuids = new Set(
          userProgramAreas
            .filter(({ user_uuid }) => user_uuid === loggedInUserUuid)
            .map(({ program_area_uuid }) => program_area_uuid),
        );
        return listedUsers.filter(
          ({ user_type, program_areas }) =>
            user_type !== USER_TYPE.ADMIN &&
            program_areas.some(({ program_area_uuid }) =>
              accessibleProgramAreaUuids.has(program_area_uuid),
            ),
        );
      });
  } catch (error: unknown) {
    const message = "Failed to list users";
    console.error({ message, error });
    throw new UserFacingError(message);
  }
};

const listActiveUsersQuery = async (db: Kysely<Core>) => {
  return await db
    .selectFrom("user")
    .selectAll()
    .where("status", "=", "active")
    .orderBy("email")
    .execute();
};
