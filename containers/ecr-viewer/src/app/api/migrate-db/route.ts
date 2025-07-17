import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { dbDialect } from "@/app/data/metadataDb/utils/db-config";
import { createInitialAdminUser } from "@/app/services/userService";

import { migrateDown, migrateUp } from "./migrate";
import { updateConditions } from "./updateConditions";

const schema = z.object({
  migration_secret: z.string({
    errorMap: () => ({
      message:
        "migration secret is required. Check the server logs for the value",
    }),
  }),
  direction: z.string().default("up"),
  skip_condition_update: z
    .string()
    .optional()
    .transform((v) => v?.toLowerCase()),
  init_admin_email: z.string().optional(),
});

interface MigrationResponse {
  message: string;
  erorors?: string[];
}

/**
 * Migrate the database
 * @param request The `NextRequest` initiating the migration. form body `migration_secret` must
 * be equal to value set during instrumentation to move forward with any migration. Field `direction` can be set to
 * `down` to roll back the most recently applied db migration. Note, upwards migrations often
 * apply two migrations: one for the common schema and one for the core/extended schema, so it's
 * possible you might need to run down multiple times to get back to the desired state
 * @returns A `NextResponse` indicating whether the migration was successful
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<MigrationResponse>> {
  if (!dbDialect()) {
    return NextResponse.json(
      { message: "No database set up to migrate" },
      { status: 200 }, // success in the sense there's nothing to do
    );
  }

  if (!process.env.METADATA_DATABASE_MIGRATION_SECRET) {
    console.error("No migration secret found!");
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }

  // Parse out the form from the request
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { message: "Validation error", errors: ["No form found"] },
      { status: 400 },
    );
  }

  try {
    const {
      migration_secret,
      direction,
      skip_condition_update,
      init_admin_email,
    } = schema.parse(Object.fromEntries(formData));
    if (migration_secret !== process.env.METADATA_DATABASE_MIGRATION_SECRET) {
      console.log(
        `Migration secret: ${process.env.METADATA_DATABASE_MIGRATION_SECRET}`,
      );
      return NextResponse.json(
        {
          message:
            "Request did not have expected migration secret. See server logs for expected value",
        },
        { status: 400 },
      );
    }

    if (direction === "down") {
      await migrateDown();
    } else if (direction === "up") {
      await migrateUp();
      skip_condition_update !== "true" && (await updateConditions());
      !!init_admin_email && (await createInitialAdminUser(init_admin_email));
    } else {
      return NextResponse.json(
        {
          message: `Request did not have a valid 'direction' parameter. Expect 'up' or 'down' or no parameter. Received: ${direction}`,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ message: "success" }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          message: "Validation error",
          errors: error.errors,
        },
        { status: 400 },
      );
    }

    const message = "Internal Server Error";
    console.error({ message, error });
    return NextResponse.json({ message }, { status: 500 });
  }
}
