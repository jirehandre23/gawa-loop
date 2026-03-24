import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Admin user ID from Supabase database
const ADMIN_USER_ID = "b417d903-e385-483d-97ff-c66c20a2716f";

export async function GET() {
  const { data, error } = await adminSupabase.auth.admin.updateUserById(
    ADMIN_USER_ID,
    { password: "GawaLoop2026!" }
  );

  if (error) {
    return NextResponse.json({ error: error.message });
  }

  return NextResponse.json({
    success: true,
    email: data.user.email,
    message: "Password set to: GawaLoop2026!"
  });
}
