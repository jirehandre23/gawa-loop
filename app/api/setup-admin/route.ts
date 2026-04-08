import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data, error } = await supabase.auth.admin.createUser({
    email: "admin@gawaloop.com",
    password: "GawaAdmin2026!",
    email_confirm: true,
    user_metadata: { name: "GAWA Admin" },
  });

  if (error) {
    return NextResponse.json({ success: false, error: error.message });
  }

  await supabase.from("businesses").upsert(
    { name: "GAWA Admin", email: "admin@gawaloop.com", status: "approved", account_type: "restaurant" },
    { onConflict: "email" }
  );

  return NextResponse.json({ success: true, id: data.user.id, email: data.user.email });
}
