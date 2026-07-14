import { NextRequest, NextResponse } from "next/server";
import { getStats } from "@/lib/db";
import { getServerSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = getServerSession(req);
    if (!session) {
      return NextResponse.json({ error: "No autorizado. Inicie sesión." }, { status: 401 });
    }

    const stats = await getStats();
    return NextResponse.json(stats);
  } catch (err) {
    console.error("Error getting stats:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

