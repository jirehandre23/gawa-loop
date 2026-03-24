import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ success: false, error: "Email required." }, { status: 400 });
  }

  const { error } = await adminSupabase.auth.resetPasswordForEmail(email, {
    redirectTo: "https://gawaloop.com/business/reset-password",
  });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
