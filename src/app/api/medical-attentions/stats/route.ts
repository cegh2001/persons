import { NextRequest, NextResponse } from "next/server";
import { getAttentionStats } from "@/lib/db-medical";
import { getServerSession } from "@/lib/auth";

/**
 * GET /api/medical-attentions/stats
 * Standalone medical attention statistics.
 *
 * Returns:
 *   - totalAttentions: total number of medical attention records
 *   - bySpecialty: { [specialty]: count }
 *   - byProfessional: { [professional name]: count }
 *
 * Auth: any session (admin or visor).
 */
export async function GET(_req: NextRequest) {
  try {
    const session = getServerSession(_req);
    if (!session) {
      return NextResponse.json({ error: "No autorizado. Inicie sesión." }, { status: 401 });
    }

    const stats = await getAttentionStats();
    return NextResponse.json(stats);
  } catch (err) {
    console.error("Error fetching medical attention stats:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
