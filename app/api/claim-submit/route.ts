import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase server configuration.");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

async function sendEmailSafe(params: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || !params.to) {
    return;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "GAWA Loop <no-reply@gawaloop.com>",
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Resend send failed:", text);
    }
  } catch (error) {
    console.error("Email send failed:", error);
  }
}

function makeCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const listingId = body?.listingId;
    const firstName = (body?.firstName || "").trim();
    const phone = (body?.phone || "").trim() || null;
    const email = (body?.email || "").trim();
    const etaMinutes = Number(body?.etaMinutes);

    if (!listingId || !firstName || !email || !etaMinutes) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    const admin = getAdminClient();

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
        { error: "This listing is no longer available." },
        { status: 400 }
      );
    }

    const holdMinutes = Number(listing.claim_hold_minutes || 10);
    const code = makeCode();
    const reservedUntil = new Date(
      Date.now() + holdMinutes * 60 * 1000
    ).toISOString();

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
        { error: "Could not reserve listing." },
        { status: 500 }
      );
    }

    const { error: claimError } = await admin.from("claims").insert({
      listing_id: listingId,
      first_name: firstName,
      phone,
      email,
      eta_minutes: etaMinutes,
      confirmation_code: code,
    });

    if (claimError) {
      await admin
        .from("listings")
        .update({
          status: "AVAILABLE",
          reserved_until: null,
          claim_code: null,
        })
        .eq("id", listingId);

      return NextResponse.json(
        { error: "Could not create claim." },
        { status: 500 }
      );
    }

    const { data: business } = await admin
      .from("businesses")
      .select("*")
      .eq("name", listing.business_name)
      .maybeSingle();

    const businessName = business?.name || listing.business_name || "Business";
    const businessAddress = business?.address || listing.address || "Not provided";
    const businessPhone = business?.phone || "Not provided";
    const businessEmail = business?.email || "Not provided";
    const foodName = listing.food_name || listing.category || "Food item";

    const customerHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2>Your GAWA Loop reservation is confirmed</h2>
        <p>Hi ${firstName},</p>
        <p>Your order claim was successfully reserved.</p>
        <div style="padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; margin: 16px 0;">
          <p><strong>Confirmation code:</strong> ${code}</p>
          <p><strong>Food:</strong> ${foodName}</p>
          <p><strong>Business:</strong> ${businessName}</p>
          <p><strong>Address:</strong> ${businessAddress}</p>
          <p><strong>Phone:</strong> ${businessPhone}</p>
          <p><strong>Email:</strong> ${businessEmail}</p>
          <p><strong>Your ETA:</strong> ${etaMinutes} minutes</p>
        </div>
        <p>Please show your confirmation code when you arrive.</p>
      </div>
    `;

    const businessHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2>New reservation on GAWA Loop</h2>
        <p><strong>Customer name:</strong> ${firstName}</p>
        <p><strong>Customer email:</strong> ${email}</p>
        <p><strong>Customer phone:</strong> ${phone || "Not provided"}</p>
        <p><strong>ETA:</strong> ${etaMinutes} minutes</p>
        <p><strong>Confirmation code:</strong> ${code}</p>
        <p><strong>Food:</strong> ${foodName}</p>
      </div>
    `;

    await Promise.all([
      sendEmailSafe({
        to: email,
        subject: "Your GAWA Loop reservation code",
        html: customerHtml,
      }),
      business?.email
        ? sendEmailSafe({
            to: business.email,
            subject: "New customer reservation",
            html: businessHtml,
          })
        : Promise.resolve(),
      sendEmailSafe({
        to: "admin@gawaloop.com",
        subject: "New GAWA Loop reservation",
        html: businessHtml,
      }),
    ]);

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
    console.error("claim-submit error:", error);
    return NextResponse.json(
      { error: "Could not create claim." },
      { status: 500 }
    );
  }
}
