import { getDb } from "@/app/data/metadataDb/database";
import { Core } from "@/app/data/metadataDb/types/core";
import { createProgramArea } from "@/app/services/programAreaService";
import {
  createInitialAdminUser,
  createUser,
  updateUserProgramAreas,
} from "@/app/services/userService";

/**
 * Seed the user and program tables with:
 * - an admin (admin@admin.com)
 * - standard user (standard@standard.com)
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

  await createInitialAdminUser("admin@admin.com");
  const progId = await createProgramArea("test", ["123"]);
  const userId = await createUser("standard@standard.com", "standard");
  await updateUserProgramAreas(userId, [progId]);
};
