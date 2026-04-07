import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ orders: [] });

    // Step 1: get the customer's email from their profile
    const { data: profile } = await supabase
      .from("customer_profiles")
      .select("email")
      .eq("user_id", userId)
      .single();

    if (!profile?.email) return NextResponse.json({ orders: [] });

    // Step 2: fetch all claims by email (covers both guest and logged-in claims)
    const { data: claims, error } = await supabase
      .from("claims")
      .select(`
        id,
        status,
        created_at,
        confirmation_code,
        noshow,
        listing_id,
        listings (
          food_name,
          category,
          business_name,
          address,
          image_url
        )
      `)
      .ilike("email", profile.email)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("customer-orders error:", error);
      return NextResponse.json({ orders: [] });
    }

    return NextResponse.json({ orders: claims || [] });
  } catch (err) {
    console.error("customer-orders exception:", err);
    return NextResponse.json({ orders: [] });
  }
}
