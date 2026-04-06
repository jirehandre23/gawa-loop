import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ suspended: false });

  const { data: profile } = await supabase
    .from("customer_profiles")
    .select("suspended_until, permanently_banned, noshow_count")
    .eq("user_id", userId)
    .single();

  if (!profile) return NextResponse.json({ suspended: false });

  if (profile.permanently_banned) {
    return NextResponse.json({ suspended: true, banned: true, message: "Your account has been permanently banned due to repeated missed pickups. Contact admin@gawaloop.com if you believe this is a mistake." });
  }

  if (profile.suspended_until) {
    const until = new Date(profile.suspended_until);
    if (until > new Date()) {
      return NextResponse.json({
        suspended: true,
        banned: false,
        suspended_until: until.toISOString(),
        message: `Your account is suspended until ${until.toLocaleDateString()}. You missed too many pickup reservations.`,
      });
    }
  }

  return NextResponse.json({ suspended: false, noshow_count: profile.noshow_count });
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILE 3 (REPLACE): app/business/dashboard/page.tsx
Only change from previous: add "Mark No-Show" button on RESERVED listings.
Find the action buttons section and replace with this updated version:

In the RESERVED action buttons div, ADD this button BEFORE the cancel reservation button:

{isReserved && (
  <button onClick={() => handleNoShow(listing.id, activeClaim?.id || "")}
    style={{ background: "#6b7280", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "14px" }}>
    🚫 No-Show
  </button>
)}

And add this function inside the component (after handleCancelListing):

async function handleNoShow(listingId: string, claimId: string) {
  if (!claimId) { alert("No active claim found."); return; }
  if (!confirm("Mark this customer as a no-show? The listing will be freed and the customer will be notified.")) return;
  const res  = await fetch("/api/mark-noshow", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ claimId, listingId }),
  });
  const data = await res.json();
  if (data.success) {
    setListings(prev => prev.map(l => l.id === listingId ? { ...l, status: "AVAILABLE", reserved_until: null as unknown as string, claim_code: null as unknown as string } : l));
    if (data.banned) alert("Customer has been permanently banned after 12+ no-shows.");
    else if (data.suspended) alert(`Customer suspended until ${new Date(data.suspended_until).toLocaleDateString()}.`);
    else alert(`No-show recorded. Customer has ${data.noshow_count} missed pickup(s).`);
  }
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BROWSE PAGE — add suspension check to claim flow
In app/browse/page.tsx, update the submitClaim function:
Replace the current submitClaim with this version that checks suspension first:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function submitClaim(listing: Listing) {
  setSubmitting(true);
  setClaimError("");

  // Check if customer is suspended before allowing claim
  if (custUser?.id) {
    const suspCheck = await fetch("/api/check-suspension", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: custUser.id }),
    });
    const suspData = await suspCheck.json();
    if (suspData.suspended) {
      setClaimError(suspData.message);
      setSubmitting(false);
      return;
    }
  }

  const res = await fetch("/api/claim-submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      listing_id:       listing.id,
      first_name:       claimForm.first_name,
      email:            claimForm.email,
      phone:            claimForm.phone || null,
      eta_minutes:      Number(claimForm.eta_minutes),
      customer_user_id: custUser?.id || null,
    }),
  });
  const data = await res.json();
  if (data.success) {
    setClaimResult({ code: data.code, food: listing.food_name });
    setClaimingId(null);
    loadListings();
  } else {
    setClaimError(data.error || "Something went wrong. Please try again.");
  }
  setSubmitting(false);
}
