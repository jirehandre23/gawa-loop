import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const USER_ID = "5431cf6d-7524-489e-9d05-e3f7610cff23";

  const { data, error } = await supabase.auth.admin.updateUserById(USER_ID, {
    password: "GawaAdmin2026!",
    email_confirm: true,
  });

  if (error) {
    return NextResponse.json({ success: false, error: error.message });
  }

  return NextResponse.json({ success: true, email: data.user.email });
}
