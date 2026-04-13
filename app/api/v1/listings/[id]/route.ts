import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getBusinessFromKey(req: NextRequest): Promise<{ business_name: string } | null> {
  const apiKey = req.headers.get("authorization")?.replace("Bearer ", "").trim() || "";
  if (!apiKey.startsWith("gawa_live_")) return null;
  const { data } = await supabase
    .from("business_api_keys")
    .select("business_name, active")
    .eq("api_key", apiKey)
    .single();
  return data?.active ? data : null;
}

// GET /api/v1/listings/:id
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const biz = await getBusinessFromKey(req);
  if (!biz) return NextResponse.json({ success: false, error: "Invalid API key." }, { status: 401 });

  const { data: listing } = await supabase
    .from("listings")
    .select("*, claims(*)")
    .eq("id", params.id)
    .eq("business_name", biz.business_name)
    .single();

  if (!listing) return NextResponse.json({ success: false, error: "Listing not found." }, { status: 404 });
  return NextResponse.json({ success: true, listing });
}

// DELETE /api/v1/listings/:id — cancel a listing
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const biz = await getBusinessFromKey(req);
  if (!biz) return NextResponse.json({ success: false, error: "Invalid API key." }, { status: 401 });

  const { data: listing } = await supabase
    .from("listings")
    .select("id, status, food_name, business_name")
    .eq("id", params.id)
    .eq("business_name", biz.business_name)
    .single();

  if (!listing) return NextResponse.json({ success: false, error: "Listing not found." }, { status: 404 });

  if (["PICKED_UP", "EXPIRED", "CANCELLED"].includes(listing.status)) {
    return NextResponse.json(
      { success: false, error: `Listing is already ${listing.status}.` },
      { status: 409 }
    );
  }

  await supabase.from("listings").update({ status: "CANCELLED" }).eq("id", params.id);

  return NextResponse.json({
    success: true,
    message: `"${listing.food_name}" has been cancelled.`,
  });
}

// PATCH /api/v1/listings/:id — mark as picked up
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const biz = await getBusinessFromKey(req);
  if (!biz) return NextResponse.json({ success: false, error: "Invalid API key." }, { status: 401 });

  const { data: listing } = await supabase
    .from("listings")
    .select("id, status, food_name")
    .eq("id", params.id)
    .eq("business_name", biz.business_name)
    .single();

  if (!listing) return NextResponse.json({ success: false, error: "Listing not found." }, { status: 404 });

  if (listing.status !== "RESERVED") {
    return NextResponse.json(
      { success: false, error: "Listing must be RESERVED before marking as picked up." },
      { status: 409 }
    );
  }

  await supabase.from("listings").update({ status: "PICKED_UP" }).eq("id", params.id);

  return NextResponse.json({
    success: true,
    message: `"${listing.food_name}" marked as picked up.`,
  });
}
