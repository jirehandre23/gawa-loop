import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Admin client with full privileges
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ success: false, error: "Email and password required." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ success: false, error: "Password must be at least 6 characters." }, { status: 400 });
  }

  // Find the user by email
  const { data: usersData, error: listError } = await adminSupabase.auth.admin.listUsers();
  if (listError) {
    return NextResponse.json({ success: false, error: "Could not fetch users: " + listError.message }, { status: 500 });
  }

  const user = usersData.users.find(u => u.email === email);
  if (!user) {
    return NextResponse.json({ success: false, error: `No account found for ${email}` }, { status: 404 });
  }

  // Update their password
  const { error: updateError } = await adminSupabase.auth.admin.updateUserById(user.id, { password });
  if (updateError) {
    return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
