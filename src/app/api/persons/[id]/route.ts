import { NextRequest, NextResponse } from "next/server";
import { getPerson, updatePerson, deletePerson } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const person = await getPerson(Number(id));
    if (!person) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }
    return NextResponse.json(person);
  } catch (err) {
    console.error("Error getting person:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, document_id, location, is_vulnerable, notes, received_supplies, received_medical } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (document_id !== undefined) updateData.document_id = document_id;
    if (location !== undefined) updateData.location = location;
    if (is_vulnerable !== undefined) updateData.is_vulnerable = is_vulnerable ? 1 : 0;
    if (notes !== undefined) updateData.notes = notes;
    if (received_supplies !== undefined) updateData.received_supplies = received_supplies ? 1 : 0;
    if (received_medical !== undefined) updateData.received_medical = received_medical ? 1 : 0;

    const person = await updatePerson(Number(id), updateData);
    if (!person) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }
    return NextResponse.json(person);
  } catch (err) {
    console.error("Error updating person:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await deletePerson(Number(id));
    if (!deleted) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error deleting person:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
