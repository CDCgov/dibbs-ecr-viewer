import { NextRequest, NextResponse } from "next/server";

import { migrateUp } from "@/app/data/db/utils/migrate";

/**
 *
 * @param req The `NextRequest` initiating the migration
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

    await migrateUp();
    return NextResponse.json({ message: "success" }, { status: 200 });
  } catch (error: unknown) {
    const message = "Migration failed due to internal server error";
    console.error({ message, error });
    return NextResponse.json({ message }, { status: 500 });
  }
}
