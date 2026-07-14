import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, signToken, COOKIE_OPTIONS } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Correo y contraseña son requeridos." },
        { status: 400 }
      );
    }

    const user = authenticateUser(email, password);
    if (!user) {
      return NextResponse.json(
        { error: "Credenciales incorrectas." },
        { status: 401 }
      );
    }

    const token = signToken(user);
    const response = NextResponse.json({
      success: true,
      user: {
        email: user.email,
        role: user.role
      }
    });

    response.cookies.set(COOKIE_OPTIONS.name, token, COOKIE_OPTIONS.options);
    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
