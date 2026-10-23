import { NextResponse } from "next/server";
import { deleteAdminAuthCookie } from "@/lib/admin-auth";

export async function POST() {
  await deleteAdminAuthCookie();
  return NextResponse.json({ success: true });
}
