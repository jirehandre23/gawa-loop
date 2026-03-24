import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET() {
  const { data: users } = await adminSupabase.auth.admin.listUsers();
  const admin = users?.users?.find(u => u.email === "admin@gawaloop.com");

  if (!admin) {
    return NextResponse.json({ error: "Admin user not found" });
  }

  const { error } = await adminSupabase.auth.admin.updateUserById(
    admin.id,
    { password: "GawaLoop2026!" }
  );

  if (error) {
    return NextResponse.json({ error: error.message });
  }

  return NextResponse.json({ success: true, message: "Admin password set to: GawaLoop2026!" });
}
