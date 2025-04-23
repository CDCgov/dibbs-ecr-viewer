import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { migrateDown, migrateUp } from "./migrate";

const schema = z.object({
  migration_secret: z.string({
    errorMap: () => ({
      message:
        "migration secret is required. Check the server logs for the value",
    }),
  }),
  direction: z.string().default("up"),
});

/**
 * Migrate the database
 * @param request The `NextRequest` initiating the migration. form body `migration_secret` must
 * be equal to value set during instrumentation to move forward with any migration. Field `direction` can be set to
 * `down` to roll back the most recently applied db migration. Note, upwards migrations often
 * apply two migrations: one for the common schema and one for the core/extended schema, so it's
 * possible you might need to run down multiple times to get back to the desired state
 * @returns A `NextResponse` indicating whether the migration was successful
 */
export async function POST(request: NextRequest) {
  if (!process.env.METADATA_DATABASE_MIGRATION_SECRET) {
    console.error("No migration secret found!");
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }

  try {
    const { migration_secret, direction } = schema.parse(
      Object.fromEntries(await request.formData()),
    );
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
    if (error instanceof z.ZodError || error instanceof TypeError) {
      return NextResponse.json(
        {
          message: "Validation error",
          errors: error instanceof z.ZodError ? error.errors : "No form found",
        },
        { status: 400 },
      );
    }

    const message = "Migration failed due to internal server error";
    console.error({ message, error, errorType: typeof error });
    return NextResponse.json({ message }, { status: 500 });
  }
}
