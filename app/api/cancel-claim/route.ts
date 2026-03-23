import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase config.");
  return createClient(supabaseUrl, serviceRoleKey);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const claimId = searchParams.get("id");
  const code = searchParams.get("code");

  if (!claimId || !code) {
    return new Response(errorPage("Invalid cancellation link."), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  const admin = getAdminClient();

  const { data: claim, error: claimError } = await admin
    .from("claims")
    .select("*")
    .eq("id", claimId)
    .eq("confirmation_code", code)
    .single();

  if (claimError || !claim) {
    return new Response(errorPage("Claim not found or invalid link."), {
      status: 404,
      headers: { "Content-Type": "text/html" },
    });
  }

  if (claim.status === "cancelled") {
    return new Response(alreadyCancelledPage(), {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  }

  // Cancel the claim
  await admin
    .from("claims")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", claimId);

  // Release the listing back to AVAILABLE
  const { data: listing } = await admin
    .from("listings")
    .select("*")
    .eq("id", claim.listing_id)
    .single();

  if (listing && listing.status === "RESERVED") {
    const stillValid =
      listing.expires_at &&
      new Date(listing.expires_at).getTime() > Date.now();

    await admin
      .from("listings")
      .update({
        status: stillValid ? "AVAILABLE" : "EXPIRED",
        reserved_until: null,
        claim_code: null,
      })
      .eq("id", claim.listing_id);
  }

  return new Response(successPage(claim.first_name), {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
}

function successPage(name: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Reservation Cancelled</title></head>
<body style="font-family: Arial, sans-serif; background: #f1f5f9; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0;">
  <div style="background: white; border-radius: 12px; padding: 40px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
    <h1 style="color: #111827; margin-bottom: 8px;">Reservation Cancelled</h1>
    <p style="color: #6b7280;">Hi ${name}, your reservation has been cancelled. The food is now available for others to claim.</p>
    <a href="https://gawaloop.com/browse" style="display: inline-block; margin-top: 24px; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Browse Other Food</a>
  </div>
</body>
</html>`;
}

function alreadyCancelledPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Already Cancelled</title></head>
<body style="font-family: Arial, sans-serif; background: #f1f5f9; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0;">
  <div style="background: white; border-radius: 12px; padding: 40px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    <div style="font-size: 48px; margin-bottom: 16px;">ℹ️</div>
    <h1 style="color: #111827;">Already Cancelled</h1>
    <p style="color: #6b7280;">This reservation has already been cancelled.</p>
    <a href="https://gawaloop.com/browse" style="display: inline-block; margin-top: 24px; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Browse Food</a>
  </div>
</body>
</html>`;
}

function errorPage(msg: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Error</title></head>
<body style="font-family: Arial, sans-serif; background: #f1f5f9; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0;">
  <div style="background: white; border-radius: 12px; padding: 40px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
    <h1 style="color: #111827;">Something went wrong</h1>
    <p style="color: #6b7280;">${msg}</p>
    <a href="https://gawaloop.com/browse" style="display: inline-block; margin-top: 24px; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Browse Food</a>
  </div>
</body>
</html>`;
}
