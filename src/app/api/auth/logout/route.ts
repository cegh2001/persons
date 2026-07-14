import { NextRequest, NextResponse } from "next/server";
import { COOKIE_OPTIONS } from "@/lib/auth";

export async function POST(_req: NextRequest) {
  try {
    const response = NextResponse.json({ success: true });
    // Expire the cookie immediately
    response.cookies.set(COOKIE_OPTIONS.name, "", {
      ...COOKIE_OPTIONS.options,
      maxAge: 0
    });
    return response;
  } catch (err) {
    console.error("Logout error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
