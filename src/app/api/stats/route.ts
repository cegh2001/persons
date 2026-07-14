import { NextRequest, NextResponse } from "next/server";
import { getStats } from "@/lib/db";

export async function GET(_req: NextRequest) {
  try {
    const stats = await getStats();
    return NextResponse.json(stats);
  } catch (err) {
    console.error("Error getting stats:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
