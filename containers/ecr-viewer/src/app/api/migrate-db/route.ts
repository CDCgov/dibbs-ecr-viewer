import { NextRequest, NextResponse } from "next/server";

import { migrateDown, migrateUp } from "./migrate";

/**
 * Migrate the database
 * @param req The `NextRequest` initiating the migration. search param `confirm` must
 * be equal to `yes` to move forward with any migration. Search param `direction` can be set to
 * `down` to roll back the most recently applied db migration. Note, upwards migrations often
 * apply two migrations: one for the common schema and one for the core/extended schema, so it's
 * possible you might need to run down multiple times to get back to the desired state
 * @returns A `NextResponse` indicating whether the migration was successful
 */
export async function POST(req: NextRequest) {
  try {
    const confirm = req.nextUrl.searchParams.get("confirm");
    if (confirm !== "yes") {
      return NextResponse.json(
        {
          message: "Request did not have confirm=yes param, rejecting request",
        },
        { status: 400 },
      );
    }

    const direction =
      req.nextUrl.searchParams.get("direction")?.toLowerCase() || "up";
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
    const message = "Migration failed due to internal server error";
    console.error({ message, error });
    return NextResponse.json({ message }, { status: 500 });
  }
}
