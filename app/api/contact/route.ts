import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, message, subject } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ success: false, error: "Missing required fields." }, { status: 400 });
    }

    // Save to Supabase contact_submissions table
    const { error } = await supabase.from("contact_submissions").insert({
      name:    name.trim(),
      email:   email.trim().toLowerCase(),
      subject: subject || "Contact form submission",
      message: message.trim(),
      type:    "contact",
    });

    if (error) {
      console.error("Contact save error:", error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Contact route error:", err.message);
    return NextResponse.json({ success: false, error: "Server error." }, { status: 500 });
  }
}
