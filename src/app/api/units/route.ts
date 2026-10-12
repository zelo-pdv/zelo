import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "A funcionalidade de unidades de medida foi descontinuada." },
    { status: 410 },
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "A funcionalidade de unidades de medida foi descontinuada." },
    { status: 410 },
  );
}
