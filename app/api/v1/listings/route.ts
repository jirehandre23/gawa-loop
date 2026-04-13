import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── POST /api/v1/listings ────────────────────────────────────────────────────
//
// REQUIRED:
//   food_name           string    "Jerk chicken plates"
//   quantity            string    "12 portions"
//
// SCHEDULING (most important new fields):
//   starts_at           string    ISO 8601 — when listing becomes visible to customers
//                                 e.g. "2026-04-13T17:00:00.000Z"
//                                 If omitted or in the past → visible immediately (AVAILABLE)
//                                 If in the future → hidden until then (SCHEDULED)
//
//   expires_at          string    ISO 8601 — when listing stops being available
//                                 e.g. "2026-04-13T21:00:00.000Z"
//                                 Takes priority over expires_in_minutes.
//
//   expires_in_minutes  number    Minutes from now until expiry. Default: 120.
//                                 Only used if expires_at is not provided.
//
// FOOD DETAILS:
//   category            string    "Food"|"Bakery"|"Beverages"|"Prepared Meals"|"Produce"|"Other"
//   allergy_note        string    "Contains nuts, halal"
//   note                string    "Ask for Maria at the front"
//   estimated_value     number    45.00
//   weight_lbs          number    8.5  (auto-converted to kg)
//   image_url           string    Public URL to a photo of the food
//   claim_hold_minutes  number    How long to hold after claim. Default: 30. Max: 1440.
//
// EXAMPLE — food pantry scheduling pickup window:
//   {
//     "food_name": "Hot meals from hotel donation",
//     "quantity": "200 meals",
//     "image_url": "https://example.com/meals.jpg",
//     "starts_at": "2026-04-13T17:00:00.000Z",
//     "expires_at": "2026-04-13T20:00:00.000Z",
//     "allergy_note": "Vegetarian options available",
//     "note": "Enter through side door on Flatbush Ave"
//   }
//
// EXAMPLE — restaurant posting end-of-day surplus now:
//   {
//     "food_name": "Jerk chicken",
//     "quantity": "12",
//     "expires_in_minutes": 90,
//     "weight_lbs": 8.5
//   }
//
// RESPONSE 201:
//   { success, listing_id, status, starts_at, expires_at, message }
// ─────────────────────────────────────────────────────────────────────────────

const LBS_TO_KG = 0.453592;
const VALID_CATEGORIES = ["Food", "Bakery", "Beverages", "Prepared Meals", "Produce", "Other"];

export async function POST(req: NextRequest) {
  // 1. Authenticate
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

  // 2. Get business address
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

  // 3. Parse body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  // 4. Validate required fields
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

  // 5. Parse optional food fields
  const category    = VALID_CATEGORIES.includes(String(body.category || "")) ? String(body.category) : "Food";
  const note        = body.note         ? String(body.note)         : null;
  const allergyNote = body.allergy_note ? String(body.allergy_note) : null;
  const imageUrl    = body.image_url    ? String(body.image_url)    : null;
  const estValue    = body.estimated_value ? Number(body.estimated_value) : null;
  const weightKg    = body.weight_lbs      ? Number(body.weight_lbs) * LBS_TO_KG : null;
  const claimHold   = body.claim_hold_minutes ? Math.min(Number(body.claim_hold_minutes), 1440) : 30;

  // 6. Parse starts_at — when listing becomes visible
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
    // If starts_at is in the past, treat as immediate (no scheduling needed)
  }

  // 7. Parse expires_at — when listing stops being available
  let expiresAt: string;

  if (body.expires_at) {
    const parsed = new Date(String(body.expires_at));
    if (isNaN(parsed.getTime()) || parsed <= new Date()) {
      return NextResponse.json(
        { success: false, error: "expires_at must be a valid future ISO 8601 datetime.", example: "2026-04-13T21:00:00.000Z" },
        { status: 400 }
      );
    }
    // Sanity check: expires_at must be after starts_at
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

  // 8. Determine initial status
  const initialStatus = isScheduled ? "SCHEDULED" : "AVAILABLE";

  // 9. Create the listing
  const quantityNum = parseInt(quantity) || 1;
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .insert({
      business_name:      keyRow.business_name,
      address:            biz.address,
      food_name:          foodName,
      category,
      quantity,
      quantity_total:     quantityNum,
      quantity_remaining: quantityNum,
      allergy_note:       allergyNote,
      note,
      estimated_value:    estValue,
      weight_kg:          weightKg,
      image_url:          imageUrl,
      starts_at:          startsAt,
      status:             initialStatus,
      expires_at:         expiresAt,
      claim_hold_minutes: claimHold,
    })
    .select("id, status, starts_at, expires_at")
    .single();

  if (listingError || !listing) {
    return NextResponse.json(
      { success: false, error: "Failed to create listing. Please try again." },
      { status: 500 }
    );
  }

  // 10. Update API key usage stats (non-blocking)
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
    : `"${foodName}" is now live on GAWA Loop. Customers can claim it at ${biz.address}. Expires at ${new Date(expiresAt).toLocaleString()}.`;

  return NextResponse.json(
    {
      success:    true,
      listing_id: listing.id,
      status:     listing.status,
      starts_at:  listing.starts_at,
      expires_at: listing.expires_at,
      message:    scheduleMsg,
    },
    { status: 201 }
  );
}

// ─── GET /api/v1/listings ─────────────────────────────────────────────────────

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
    .select("id, food_name, category, quantity, status, starts_at, expires_at, created_at, image_url, weight_kg")
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
