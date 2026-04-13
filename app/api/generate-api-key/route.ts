import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const businessName: string  = body.business_name  || "";
  const businessEmail: string = body.business_email || "";

  if (!businessName || !businessEmail) {
    return NextResponse.json(
      { success: false, error: "Missing business_name or business_email" },
      { status: 400 }
    );
  }

  // Return existing key if one already exists
  const { data: existing } = await supabase
    .from("business_api_keys")
    .select("api_key, total_calls, last_used_at")
    .eq("business_email", businessEmail)
    .eq("active", true)
    .single();

  if (existing) {
    return NextResponse.json({
      success: true,
      api_key: existing.api_key,
      existing: true,
      total_calls: existing.total_calls || 0,
      last_used_at: existing.last_used_at || null,
    });
  }

  // Generate a new key
  const { data: newKey, error } = await supabase
    .from("business_api_keys")
    .insert({ business_name: businessName, business_email: businessEmail })
    .select("api_key")
    .single();

  if (error || !newKey) {
    return NextResponse.json(
      { success: false, error: "Failed to generate API key." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { success: true, api_key: newKey.api_key, existing: false },
    { status: 201 }
  );
}

