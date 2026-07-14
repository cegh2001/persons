import { NextRequest, NextResponse } from "next/server";
import { listPersons, createPerson } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;
    const location = searchParams.get("location") || undefined;
    
    const isVulnerableParam = searchParams.get("is_vulnerable");
    const is_vulnerable = isVulnerableParam !== null ? parseInt(isVulnerableParam, 10) : undefined;

    const receivedSuppliesParam = searchParams.get("received_supplies");
    const received_supplies = receivedSuppliesParam !== null ? parseInt(receivedSuppliesParam, 10) : undefined;

    const receivedMedicalParam = searchParams.get("received_medical");
    const received_medical = receivedMedicalParam !== null ? parseInt(receivedMedicalParam, 10) : undefined;

    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "15", 10);

    const result = await listPersons({ 
      search, 
      location, 
      is_vulnerable, 
      received_supplies,
      received_medical,
      page, 
      pageSize 
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("Error listing persons:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, document_id, location, is_vulnerable, notes, received_supplies, received_medical } = body;

    if (!name || !location) {
      return NextResponse.json({ error: "Missing required fields: name and location are required." }, { status: 400 });
    }

    const newPerson = await createPerson({ 
      name, 
      document_id, 
      location, 
      is_vulnerable: is_vulnerable ? 1 : 0, 
      notes: notes || "",
      received_supplies: received_supplies !== undefined ? (received_supplies ? 1 : 0) : 1,
      received_medical: received_medical !== undefined ? (received_medical ? 1 : 0) : 0
    });
    return NextResponse.json(newPerson, { status: 201 });
  } catch (err) {
    console.error("Error creating person:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
