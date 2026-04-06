import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  const { data } = await supabase.from("platform_stats").select("*").single();
  return NextResponse.json(data || { total_pickups: 0, total_weight_kg: 0, co2_saved_kg: 0 });
}
