import { NextResponse } from "next/server";

export async function PUT() {
  return NextResponse.json(
    { error: "A funcionalidade de unidades de medida foi descontinuada." },
    { status: 410 },
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "A funcionalidade de unidades de medida foi descontinuada." },
    { status: 410 },
  );
}
