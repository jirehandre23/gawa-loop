import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data } = await supabase.from("platform_stats").select("*").single();

  const totalPickups  = data?.total_pickups   ?? 0;
  const totalWeightKg = data?.total_weight_kg ?? 0;

  const totalWeightLbs = totalWeightKg * 2.20462;
  const co2SavedLbs    = Math.round(totalWeightLbs * 2.5);

  return NextResponse.json({
    total_pickups: totalPickups,
    co2_saved_lbs: co2SavedLbs,
  });
}
