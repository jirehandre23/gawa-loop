import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ClaimBody = {
  listingId: string;
  firstName: string;
  phone: string;
  email: string;
  etaMinutes: number;
};

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !to) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "GAWA Loop <no-reply@gawaloop.com>",
      to: [to],
      subject,
      html,
    }),
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ClaimBody;
    const { listingId, firstName, phone, email, etaMinutes } = body;

    if (!listingId || !firstName || !email || !etaMinutes) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Missing Supabase server configuration." },
        { status: 500 }
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: listing, error: listingError } = await admin
      .from("listings")
      .select("*")
      .eq("id", listingId)
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: "Listing not found." },
        { status: 404 }
      );
    }

    if (listing.status !== "AVAILABLE") {
      return NextResponse.json(
        { error: "This food is no longer available." },
        { status: 400 }
      );
    }

    if (
      listing.listing_expires_at &&
      new Date(listing.listing_expires_at).getTime() <= Date.now()
    ) {
      return NextResponse.json(
        { error: "This listing has expired." },
        { status: 400 }
      );
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const holdMinutes = listing.claim_hold_minutes || 10;
    const reservedUntil = new Date(
      Date.now() + holdMinutes * 60 * 1000
    ).toISOString();

    const { error: claimError } = await admin.from("claims").insert({
      listing_id: listingId,
      first_name: firstName,
      phone,
      email,
      eta_minutes: Number(etaMinutes),
      confirmation_code: code,
    });

    if (claimError) {
      return NextResponse.json(
        { error: "Could not create claim." },
        { status: 500 }
      );
    }

    const { error: updateError } = await admin
      .from("listings")
      .update({
        status: "RESERVED",
        reserved_until: reservedUntil,
        claim_code: code,
      })
      .eq("id", listingId)
      .eq("status", "AVAILABLE");

    if (updateError) {
      return NextResponse.json(
        { error: "Could not reserve this item." },
        { status: 500 }
      );
    }

    const { data: business } = await admin
      .from("businesses")
      .select("*")
      .eq("name", listing.business_name)
      .single();

    const businessName = business?.name || listing.business_name || "Restaurant";
    const businessAddress = business?.address || listing.address || "Not provided";
    const businessPhone = business?.phone || "Not provided";
    const businessEmail = business?.email || "Not provided";
    const foodName = listing.food_name || listing.category || "Food listing";

    const customerHtml = `
      <h2>Your GAWA Loop reservation is confirmed</h2>
      <p>Hello ${firstName},</p>
      <p>Your food reservation has been confirmed.</p>
      <p><strong>Confirmation code:</strong> ${code}</p>
      <p><strong>Food:</strong> ${foodName}</p>
      <p><strong>Business:</strong> ${businessName}</p>
      <p><strong>Address:</strong> ${businessAddress}</p>
      <p><strong>Phone:</strong> ${businessPhone}</p>
      <p><strong>Email:</strong> ${businessEmail}</p>
      <p><strong>ETA selected:</strong> ${etaMinutes} minutes</p>
      <p>Please show this code at pickup.</p>
    `;

    const businessHtml = `
      <h2>New reservation on GAWA Loop</h2>
      <p><strong>Customer name:</strong> ${firstName}</p>
      <p><strong>Customer email:</strong> ${email}</p>
      <p><strong>Customer phone:</strong> ${phone || "Not provided"}</p>
      <p><strong>Food:</strong> ${foodName}</p>
      <p><strong>ETA:</strong> ${etaMinutes} minutes</p>
      <p><strong>Confirmation code:</strong> ${code}</p>
      <p><strong>Pickup address:</strong> ${businessAddress}</p>
    `;

    const adminHtml = `
      <h2>New reservation copy</h2>
      <p><strong>Business:</strong> ${businessName}</p>
      <p><strong>Customer name:</strong> ${firstName}</p>
      <p><strong>Customer email:</strong> ${email}</p>
      <p><strong>Customer phone:</strong> ${phone || "Not provided"}</p>
      <p><strong>Food:</strong> ${foodName}</p>
      <p><strong>Confirmation code:</strong> ${code}</p>
    `;

    try {
      await Promise.all([
        sendEmail(email, "Your GAWA Loop reservation code", customerHtml),
        business?.email
          ? sendEmail(business.email, "New customer reservation", businessHtml)
          : Promise.resolve(),
        sendEmail("admin@gawaloop.com", "New GAWA Loop reservation", adminHtml),
      ]);
    } catch (emailError) {
      console.error("Email sending failed", emailError);
    }

    return NextResponse.json({
      ok: true,
      code,
      businessName,
      businessAddress,
      businessPhone,
      businessEmail,
      foodName,
    });
  } catch (error) {
    console.error("claim-submit error", error);
    return NextResponse.json(
      { error: "Could not complete reservation." },
      { status: 500 }
    );
  }
}
