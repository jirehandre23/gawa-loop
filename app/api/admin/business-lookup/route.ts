import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase server configuration.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body?.action;

    const admin = getAdminClient();

    if (action === "search") {
      const query = (body?.query || "").trim().toLowerCase();

      if (!query) {
        return NextResponse.json(
          { error: "Search query is required." },
          { status: 400 }
        );
      }

      const { data: businesses, error } = await admin
        .from("businesses")
        .select("*")
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(20);

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ businesses: businesses || [] });
    }

    if (action === "send_reset") {
      const email = (body?.email || "").trim();

      if (!email) {
        return NextResponse.json(
          { error: "Email is required." },
          { status: 400 }
        );
      }

      const { error } = await admin.auth.resetPasswordForEmail(email, {
        redirectTo: "https://gawaloop.com/business/reset-password",
      });

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true });
    }

    if (action === "set_temp_password") {
      const email = (body?.email || "").trim();
      const temporaryPassword = (body?.temporaryPassword || "").trim();

      if (!email || !temporaryPassword) {
        return NextResponse.json(
          { error: "Email and temporary password are required." },
          { status: 400 }
        );
      }

      if (temporaryPassword.length < 6) {
        return NextResponse.json(
          { error: "Temporary password must be at least 6 characters." },
          { status: 400 }
        );
      }

      const { data: usersData, error: listError } =
        await admin.auth.admin.listUsers();

      if (listError) {
        return NextResponse.json(
          { error: listError.message },
          { status: 500 }
        );
      }

      const user = usersData?.users?.find(
        (u) => (u.email || "").toLowerCase() === email.toLowerCase()
      );

      if (!user) {
        return NextResponse.json(
          { error: "Business auth user not found." },
          { status: 404 }
        );
      }

      const { error: updateError } = await admin.auth.admin.updateUserById(
        user.id,
        { password: temporaryPassword }
      );

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { error: "Invalid action." },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Something went wrong." },
      { status: 500 }
    );
  }
}
