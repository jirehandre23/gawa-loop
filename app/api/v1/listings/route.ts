import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  // 1. Authenticate via API key
  const authHeader = req.headers.get("authorization") || "";
  const apiKey = authHeader.replace("Bearer ", "").trim();

  if (!apiKey || !apiKey.startsWith("gawa_live_")) {
    return NextResponse.json(
      { success: false, error: "Missing or invalid API key. Include: Authorization: Bearer gawa_live_xxxx" },
      { status: 401 }
    );
  }

  // 2. Look up the business from the API key
  const { data: keyRow } = await supabase
    .from("business_api_keys")
    .select("id, business_name, business_email, active, total_calls")
    .eq("api_key", apiKey)
    .single();

  if (!keyRow || !keyRow.active) {
    return NextResponse.json(
      { success: false, error: "API key not found or inactive. Visit gawaloop.com/business/dashboard to get your key." },
      { status: 401 }
    );
  }

  // 3. Get business address from businesses table
  const { data: biz } = await supabase
    .from("businesses")
    .select("address, status")
    .eq("name", keyRow.business_name)
    .single();

  if (!biz || biz.status !== "approved") {
    return NextResponse.json(
      { success: false, error: "Your business account is not yet approved. Contact support@gawaloop.com." },
      { status: 403 }
    );
  }

  // 4. Parse and validate body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const foodName = String(body.food_name || "").trim();
  const quantity  = String(body.quantity  || "").trim();
  if (!foodName || !quantity) {
    return NextResponse.json(
      { success: false, error: "Required fields: food_name, quantity" },
      { status: 400 }
    );
  }

  const category       = String(body.category        || "Food");
  const note           = body.note             ? String(body.note)            : null;
  const estimatedValue = body.estimated_value  ? Number(body.estimated_value) : null;
  const expiresMinutes = body.expires_in_minutes ? Number(body.expires_in_minutes) : 120;
  const claimHold      = body.claim_hold_minutes  ? Number(body.claim_hold_minutes)  : 30;
  const expiresAt      = new Date(Date.now() + expiresMinutes * 60 * 1000).toISOString();

  // 5. Create the listing
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .insert({
      business_name:      keyRow.business_name,
      address:            biz.address,
      food_name:          foodName,
      category,
      quantity,
      note,
      estimated_value:    estimatedValue,
      status:             "AVAILABLE",
      expires_at:         expiresAt,
      claim_hold_minutes: claimHold,
    })
    .select("id, status, expires_at")
    .single();

  if (listingError || !listing) {
    return NextResponse.json(
      { success: false, error: "Failed to create listing. Please try again." },
      { status: 500 }
    );
  }

  // 6. Update API key usage stats (non-blocking)
  supabase
    .from("business_api_keys")
    .update({
      last_used_at: new Date().toISOString(),
      total_calls:  (keyRow.total_calls || 0) + 1,
    })
    .eq("api_key", apiKey)
    .then(() => {});

  return NextResponse.json(
    {
      success:    true,
      listing_id: listing.id,
      status:     listing.status,
      expires_at: listing.expires_at,
      message:    `"${foodName}" is now live on GAWA Loop. Customers can claim it at ${biz.address}.`,
    },
    { status: 201 }
  );
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const apiKey = authHeader.replace("Bearer ", "").trim();

  if (!apiKey || !apiKey.startsWith("gawa_live_")) {
    return NextResponse.json({ success: false, error: "Missing or invalid API key." }, { status: 401 });
  }

  const { data: keyRow } = await supabase
    .from("business_api_keys")
    .select("business_name, active")
    .eq("api_key", apiKey)
    .single();

  if (!keyRow?.active) {
    return NextResponse.json({ success: false, error: "Invalid API key." }, { status: 401 });
  }

  const { data: listings } = await supabase
    .from("listings")
    .select("id, food_name, category, quantity, status, expires_at, created_at, reserved_until")
    .eq("business_name", keyRow.business_name)
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({
    success:  true,
    business: keyRow.business_name,
    listings: listings || [],
    total:    listings?.length || 0,
  });
}

