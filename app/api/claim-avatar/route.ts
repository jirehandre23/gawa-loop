import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ avatar_url: null });

  const { data } = await supabase
    .from("customer_profiles")
    .select("avatar_url, first_name, last_name")
    .ilike("email", email)
    .single();

  return NextResponse.json({
    avatar_url: data?.avatar_url || null,
    first_name: data?.first_name || null,
    last_name:  data?.last_name  || null,
  });
}
