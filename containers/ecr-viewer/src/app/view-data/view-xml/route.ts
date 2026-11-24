import { NextRequest, NextResponse } from "next/server";

import { isLoggedInUserEcrAuthed } from "@/app/services/userService";
import { getLoggedInUserSession } from "@/app/utils/auth-utils";
import {
  getEcrXmls,
  XmlNotFoundError,
} from "@/app/view-data/services/xmlService";

/**
 * Return stored XML after checking access to the requested eCR.
 * @param request Request containing the eCR ID
 * @returns XML documents or an error response
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (process.env.SAVE_XML !== "true") {
    return NextResponse.json(
      { message: "XML storage is not enabled" },
      { status: 404 },
    );
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { message: "Missing id parameter" },
      { status: 400 },
    );
  }

  try {
    const user = await getLoggedInUserSession();
    if (user && !(await isLoggedInUserEcrAuthed(id))) {
      return NextResponse.json(
        { message: "XML archive not found" },
        { status: 404 },
      );
    }

    const xmls = await getEcrXmls(id);
    return NextResponse.json(xmls);
  } catch (error) {
    if (error instanceof XmlNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    console.error({ message: "Failed to retrieve XML", error, id });
    return NextResponse.json(
      { message: "Failed to retrieve XML" },
      { status: 500 },
    );
  }
}
