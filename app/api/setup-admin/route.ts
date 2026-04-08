mport { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Delete existing admin user by email directly from DB
  const { error: delError } = await supabase
    .from("auth.users")
    .delete()
    .eq("email", "admin@gawaloop.com");

  // Create fresh admin user using admin API
  const { data, error } = await supabase.auth.admin.createUser({
    email: "admin@gawaloop.com",
    password: "GawaAdmin2026!",
    email_confirm: true,
    user_metadata: { name: "GAWA Admin" },
  });

  if (error) {
    return NextResponse.json({ success: false, error: error.message });
  }

  // Ensure businesses record exists
  await supabase.from("businesses").upsert(
    { name: "GAWA Admin", email: "admin@gawaloop.com", status: "approved", account_type: "restaurant" },
    { onConflict: "email" }
  );

  return NextResponse.json({
    success: true,
    id: data.user.id,
    email: data.user.email,
    message: "Done! Login with GawaAdmin2026! then delete this file.",
  });
}
