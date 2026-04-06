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
    return NextResponse.json({
      suspended: true,
      banned: true,
      message: "Your account has been permanently banned due to repeated missed pickups. Contact admin@gawaloop.com if you believe this is a mistake.",
    });
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
