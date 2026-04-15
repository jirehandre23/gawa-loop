import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const LBS_TO_KG = 0.453592;
const VALID_CATEGORIES = ["Food", "Bakery", "Beverages", "Prepared Meals", "Produce", "Other"];

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const apiKey = authHeader.replace("Bearer ", "").trim();

  if (!apiKey || !apiKey.startsWith("gawa_live_")) {
    return NextResponse.json(
      { success: false, error: "Missing or invalid API key.", hint: "Include header: Authorization: Bearer gawa_live_xxxx" },
      { status: 401 }
    );
  }

  const { data: keyRow } = await supabase
    .from("business_api_keys")
    .select("id, business_name, business_email, active, total_calls")
    .eq("api_key", apiKey)
    .single();

  if (!keyRow || !keyRow.active) {
    return NextResponse.json(
      { success: false, error: "API key not found or inactive.", hint: "Generate a key from your GAWA Loop dashboard." },
      { status: 401 }
    );
  }

  const { data: biz } = await supabase
    .from("businesses")
    .select("address, status")
    .eq("name", keyRow.business_name)
    .single();

  if (!biz || biz.status !== "approved") {
    return NextResponse.json(
      { success: false, error: "Business not approved.", hint: "Contact support@gawaloop.com." },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const foodName = String(body.food_name || "").trim();
  const quantity  = String(body.quantity  || "").trim();

  if (!foodName) {
    return NextResponse.json(
      { success: false, error: "food_name is required.", example: { food_name: "Jerk chicken", quantity: "12 portions" } },
      { status: 400 }
    );
  }
  if (!quantity) {
    return NextResponse.json(
      { success: false, error: "quantity is required.", example: { food_name: "Jerk chicken", quantity: "12 portions" } },
      { status: 400 }
    );
  }

  const category    = VALID_CATEGORIES.includes(String(body.category || "")) ? String(body.category) : "Food";
  const note        = body.note         ? String(body.note)         : null;
  const allergyNote = body.allergy_note ? String(body.allergy_note) : null;
  const imageUrl    = body.image_url    ? String(body.image_url)    : null;
  const estValue    = body.estimated_value ? Number(body.estimated_value) : null;
  const weightKg    = body.weight_lbs      ? Number(body.weight_lbs) * LBS_TO_KG : null;
  const claimHold   = body.claim_hold_minutes ? Math.min(Number(body.claim_hold_minutes), 1440) : 50;  // ← CHANGED 30 → 50

  const maxPortionsPerClaim = body.max_portions_per_claim
    ? Math.max(1, Math.floor(Number(body.max_portions_per_claim)))
    : null;

  let startsAt: string | null = null;
  let isScheduled = false;

  if (body.starts_at) {
    const parsed = new Date(String(body.starts_at));
    if (isNaN(parsed.getTime())) {
      return NextResponse.json(
        { success: false, error: "starts_at must be a valid ISO 8601 datetime.", example: "2026-04-13T17:00:00.000Z" },
        { status: 400 }
      );
    }
    if (parsed > new Date()) {
      startsAt    = parsed.toISOString();
      isScheduled = true;
    }
  }

  let expiresAt: string;

  if (body.expires_at) {
    const parsed = new Date(String(body.expires_at));
    if (isNaN(parsed.getTime()) || parsed <= new Date()) {
      return NextResponse.json(
        { success: false, error: "expires_at must be a valid future ISO 8601 datetime.", example: "2026-04-13T21:00:00.000Z" },
        { status: 400 }
      );
    }
    if (startsAt && parsed <= new Date(startsAt)) {
      return NextResponse.json(
        { success: false, error: "expires_at must be after starts_at." },
        { status: 400 }
      );
    }
    expiresAt = parsed.toISOString();
  } else {
    const minutes = body.expires_in_minutes ? Math.min(Number(body.expires_in_minutes), 10080) : 120;
    const base    = startsAt ? new Date(startsAt) : new Date();
    expiresAt     = new Date(base.getTime() + minutes * 60 * 1000).toISOString();
  }

  const initialStatus = isScheduled ? "SCHEDULED" : "AVAILABLE";
  const quantityNum = parseInt(quantity) || 1;

  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .insert({
      business_name:          keyRow.business_name,
      address:                biz.address,
      food_name:              foodName,
      category,
      quantity,
      quantity_total:         quantityNum,
      quantity_remaining:     quantityNum,
      allergy_note:           allergyNote,
      note,
      estimated_value:        estValue,
      weight_kg:              weightKg,
      image_url:              imageUrl,
      starts_at:              startsAt,
      status:                 initialStatus,
      expires_at:             expiresAt,
      claim_hold_minutes:     claimHold,
      max_portions_per_claim: maxPortionsPerClaim,
    })
    .select("id, status, starts_at, expires_at")
    .single();

  if (listingError || !listing) {
    return NextResponse.json(
      { success: false, error: "Failed to create listing. Please try again." },
      { status: 500 }
    );
  }

  supabase
    .from("business_api_keys")
    .update({
      last_used_at: new Date().toISOString(),
      total_calls:  (keyRow.total_calls || 0) + 1,
    })
    .eq("api_key", apiKey)
    .then(() => {});

  const scheduleMsg = isScheduled
    ? `Listing is scheduled — will go live at ${new Date(startsAt!).toLocaleString()} and expire at ${new Date(expiresAt).toLocaleString()}.`
    : `"${foodName}" is now live on GAWA Loop. Customers can claim it at ${biz.address}. Expires at ${new Date(expiresAt).toLocaleString()}.${maxPortionsPerClaim ? ` Max ${maxPortionsPerClaim} portion(s) per person.` : ""}`;

  return NextResponse.json(
    {
      success:    true,
      listing_id: listing.id,
      status:     listing.status,
      starts_at:  listing.starts_at,
      expires_at: listing.expires_at,
      max_portions_per_claim: maxPortionsPerClaim,
      message:    scheduleMsg,
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
    .select("id, food_name, category, quantity, status, starts_at, expires_at, created_at, image_url, weight_kg, max_portions_per_claim")
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
