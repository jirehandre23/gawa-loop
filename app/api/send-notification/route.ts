import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail, emailWrapper } from "@/lib/email";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { type, listingId, claimId } = await req.json();

  if (!type) return NextResponse.json({ error: "Missing type" }, { status: 400 });

  // Get listing details
  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("id", listingId)
    .single();

  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  // Get business email
  const { data: business } = await supabase
    .from("businesses")
    .select("email, name")
    .eq("name", listing.business_name)
    .single();

  // Get claim if needed
  let claim: any = null;
  if (claimId) {
    const { data } = await supabase.from("claims").select("*").eq("id", claimId).single();
    claim = data;
  }

  const promises: Promise<any>[] = [];

  if (type === "food_posted" && business) {
    promises.push(
      sendEmail(
        business.email,
        `✅ Your food listing is live — ${listing.food_name}`,
        emailWrapper(`
          <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">Food Posted Successfully!</h2>
          <p style="margin:0 0 16px;font-size:15px;color:#6b7280;line-height:1.6;">
            Hi ${business.name}, your listing is now live on GAWA Loop and visible to the community.
          </p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
            <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#0a2e1a;">${listing.food_name}</p>
            <p style="margin:0;font-size:13px;color:#166534;">
              Category: ${listing.category} &nbsp;·&nbsp; Quantity: ${listing.quantity}<br/>
              Expires: ${listing.expires_at ? new Date(listing.expires_at).toLocaleString() : "N/A"}
            </p>
          </div>
          <p style="font-size:14px;color:#6b7280;margin:0;">
            You will receive an email when someone claims this food.
            <a href="https://gawaloop.com/business/dashboard" style="color:#16a34a;font-weight:600;margin-left:6px;">View Dashboard</a>
          </p>
        `)
      )
    );
  }

  if (type === "food_claimed" && business && claim) {
    // Email to business
    promises.push(
      sendEmail(
        business.email,
        `🙌 Someone claimed your food — ${listing.food_name}`,
        emailWrapper(`
          <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">Food Claimed!</h2>
          <p style="margin:0 0 16px;font-size:15px;color:#6b7280;line-height:1.6;">
            Hi ${business.name}, someone has reserved your listing. Here are their details:
          </p>
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
            <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#1d4ed8;">Customer Info</p>
            <p style="margin:0;font-size:14px;color:#1e3a5f;line-height:2;">
              Name: <b>${claim.first_name}</b><br/>
              Email: <b>${claim.email}</b><br/>
              Phone: <b>${claim.phone || "Not provided"}</b><br/>
              ETA: <b>${claim.eta_minutes} minutes</b><br/>
              Pickup Code: <b style="font-size:18px;letter-spacing:2px;color:#2563eb;">${claim.confirmation_code}</b>
            </p>
          </div>
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:14px 18px;margin-bottom:20px;">
            <p style="margin:0;font-size:13px;color:#374151;">
              Food: <b>${listing.food_name}</b> &nbsp;·&nbsp; Qty: ${listing.quantity}
            </p>
          </div>
          <a href="https://gawaloop.com/business/dashboard" style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;font-size:15px;padding:13px 28px;border-radius:10px;text-decoration:none;">
            View Dashboard
          </a>
        `)
      )
    );

    // Email to customer
    if (claim.email) {
      promises.push(
        sendEmail(
          claim.email,
          `🎉 Your food is reserved — ${listing.food_name}`,
          emailWrapper(`
            <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">Your Reservation is Confirmed!</h2>
            <p style="margin:0 0 16px;font-size:15px;color:#6b7280;">Hi ${claim.first_name}, your food has been reserved. Show this code when you arrive:</p>
            <div style="background:#f0fdf4;border:2px solid #16a34a;border-radius:16px;padding:24px;text-align:center;margin-bottom:20px;">
              <p style="margin:0 0 4px;font-size:13px;color:#6b7280;font-weight:600;">PICKUP CODE</p>
              <p style="margin:0;font-size:56px;font-weight:900;color:#16a34a;letter-spacing:8px;line-height:1;">${claim.confirmation_code}</p>
            </div>
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:14px 18px;margin-bottom:20px;">
              <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#0a2e1a;">${listing.food_name}</p>
              <p style="margin:0;font-size:13px;color:#374151;">
                From: ${listing.business_name}<br/>
                Address: ${listing.address}<br/>
                Your ETA: ${claim.eta_minutes} minutes
              </p>
            </div>
            <p style="font-size:13px;color:#6b7280;margin:0;">
              Can't make it? Please cancel so someone else can claim the food.
            </p>
          `)
        )
      );
    }
  }

  if (type === "food_picked_up" && business && claim) {
    // Email to business
    promises.push(
      sendEmail(
        business.email,
        `✅ Pickup confirmed — ${listing.food_name}`,
        emailWrapper(`
          <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">Pickup Confirmed!</h2>
          <p style="margin:0 0 16px;font-size:15px;color:#6b7280;line-height:1.6;">
            Hi ${business.name}, the food has been successfully picked up. Great job reducing food waste!
          </p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
            <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#0a2e1a;">${listing.food_name}</p>
            <p style="margin:0;font-size:13px;color:#166534;">
              Picked up by: ${claim.first_name}<br/>
              Code used: ${claim.confirmation_code}<br/>
              ${listing.weight_kg ? `Weight: ${(listing.weight_kg * 2.205).toFixed(1)} lbs donated` : ""}
            </p>
          </div>
          <a href="https://gawaloop.com/business/dashboard" style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;font-size:15px;padding:13px 28px;border-radius:10px;text-decoration:none;">
            View Dashboard
          </a>
        `)
      )
    );

    // Email to customer
    if (claim.email) {
      promises.push(
        sendEmail(
          claim.email,
          `Thank you for picking up — GAWA Loop`,
          emailWrapper(`
            <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">Thank You for Picking Up! 🌱</h2>
            <p style="margin:0 0 16px;font-size:15px;color:#6b7280;line-height:1.6;">
              Hi ${claim.first_name}, thank you for claiming and picking up the food. You helped reduce food waste in your community!
            </p>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
              <p style="margin:0;font-size:14px;color:#166534;">
                ${listing.food_name} from ${listing.business_name}<br/>
                ${listing.weight_kg ? `That is about ${(listing.weight_kg * 2.205).toFixed(1)} lbs of food saved from the landfill!` : ""}
              </p>
            </div>
            <a href="https://gawaloop.com/browse" style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;font-size:15px;padding:13px 28px;border-radius:10px;text-decoration:none;">
              Browse More Free Food
            </a>
          `)
        )
      );
    }
  }

  await Promise.allSettled(promises);
  return NextResponse.json({ success: true });
}
