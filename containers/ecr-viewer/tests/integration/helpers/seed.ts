import { getDb } from "@/app/data/metadataDb/database";
import { Core, User } from "@/app/data/metadataDb/types/core";
import { createProgramArea } from "@/app/services/programAreaService";
import { createInitialAdminUser, createUser } from "@/app/services/userService";

/**
 * Seed the user and program tables with:
 * - an admin (admin@admin.com)
 * - standard user (standard@standard.com)
 * - program admin user (programadmin@programadmin.com)
 * - two conditions (123, 456)
 * - one program area (for condition 123)
 */
export const seedUserProgramData = async () => {
  await getDb<Core>()
    .insertInto("condition_reference")
    .values({
      code: "123",
      concept_name: "condition 1 (disease)",
      condition_name: "condition 1",
      condition_category: "category",
    })
    .execute();
  await getDb<Core>()
    .insertInto("condition_reference")
    .values({
      code: "456",
      concept_name: "condition 2 (disease)",
      condition_name: "condition 2",
      condition_category: "category",
    })
    .execute();

  await createInitialAdminUser({ email: "admin@admin.com" });
  const progId = await createProgramArea({ name: "test", conditions: ["123"] });
  await createUser({
    email: "standard@standard.com",
    userType: "standard",
    programs: [progId],
  });
  await createUser({
    email: "programadmin@programadmin.com",
    userType: "prog_admin",
    programs: [progId],
  });
};

/**
 * Retrieve a seeded user by email address.
 *
 * @param email - The email address of the seeded user.
 * @returns The matching seeded user.
 * @throws {Error} If no seeded user matches the email address.
 */
export const getSeededUser = async (email: string): Promise<User> => {
  const user = await getDb<Core>()
    .selectFrom("user")
    .selectAll()
    .where("email", "=", email)
    .executeTakeFirst();

  if (!user) throw new Error(`Could not find seeded user ${email}`);
  return user;
};
