import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Step 1: Delete any existing admin user
  const { data: list } = await supabase.auth.admin.listUsers();
  const existing = list?.users?.find((u: any) => u.email === "admin@gawaloop.com");
  if (existing) {
    await supabase.auth.admin.deleteUser(existing.id);
  }

  // Step 2: Create fresh admin user with confirmed email
  const { data, error } = await supabase.auth.admin.createUser({
    email: "admin@gawaloop.com",
    password: "GawaAdmin2026!",
    email_confirm: true,
    user_metadata: { name: "GAWA Admin" },
  });

  if (error) {
    return NextResponse.json({ success: false, error: error.message });
  }

  // Step 3: Ensure businesses record exists
  await supabase.from("businesses").upsert(
    { name: "GAWA Admin", email: "admin@gawaloop.com", status: "approved", account_type: "restaurant" },
    { onConflict: "email" }
  );

  return NextResponse.json({
    success: true,
    userId: data.user.id,
    message: "Admin created! Login with GawaAdmin2026! then DELETE this file.",
  });
}
