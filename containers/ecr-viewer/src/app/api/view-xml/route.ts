import { NextRequest, NextResponse } from "next/server";

import {
  getEcrXmls,
  XmlNotFoundError,
} from "@/app/view-data/services/xmlService";

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
