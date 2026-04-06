import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file     = formData.get("file") as File;
    const bucket   = (formData.get("bucket") as string) || "listing-images";
    const folder   = (formData.get("folder") as string) || "uploads";

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const ext      = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const buffer   = Buffer.from(await file.arrayBuffer());

    // Delete old file in same folder to avoid duplicates
    const { data: existingFiles } = await supabase.storage
      .from(bucket)
      .list(folder);

    if (existingFiles && existingFiles.length > 0) {
      const oldPaths = existingFiles.map(f => `${folder}/${f.name}`);
      await supabase.storage.from(bucket).remove(oldPaths);
    }

    const { error } = await supabase.storage
      .from(bucket)
      .upload(filename, buffer, { contentType: file.type, upsert: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filename);
    return NextResponse.json({ success: true, url: publicUrl });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
