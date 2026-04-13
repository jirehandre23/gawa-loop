"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import jsQR from "jsqr";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ScanPage() {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [status, setStatus]     = useState<"idle" | "scanning" | "success" | "error">("idle");
  const [message, setMessage]   = useState("");
  const [lastCode, setLastCode] = useState("");
  const [authOk, setAuthOk]     = useState(false);
  const [bizName, setBizName]   = useState<string | null>(null);

  // Auth check
  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/business/login"; return; }
      if (user.email === "admin@gawaloop.com") { window.location.href = "/business/dashboard"; return; }
      const { data: biz } = await supabase.from("businesses").select("name").eq("email", user.email!).single();
      setBizName(biz?.name || null);
      setAuthOk(true);
    }
    check();
  }, []);

  async function startCamera() {
    setStatus("scanning");
    setMessage("");
    setLastCode("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      intervalRef.current = setInterval(scanFrame, 300);
    } catch (err: any) {
      setStatus("error");
      setMessage("Camera access denied or unavailable. Please allow camera access and try again.");
    }
  }

  function stopCamera() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setStatus("idle");
    setMessage("");
    setLastCode("");
  }

  function scanFrame() {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = jsQR(imageData.data, imageData.width, imageData.height);
    if (result?.data && result.data !== lastCode) {
      setLastCode(result.data);
      handleCode(result.data);
    }
  }

  async function handleCode(code: string) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setStatus("idle");
    setMessage(`Code detected: ${code} — looking up claim...`);

    const { data: claims, error } = await supabase
      .from("claims")
      .select("id, listing_id, first_name, quantity_claimed, status, listings(food_name, business_name)")
      .eq("confirmation_code", code)
      .eq("status", "active");

    if (error || !claims || claims.length === 0) {
      setStatus("error");
      setMessage(`No active claim found for code "${code}". It may already be picked up, cancelled, or invalid.`);
      return;
    }

    const claim = claims[0] as any;

    if (bizName && claim.listings?.business_name !== bizName) {
      setStatus("error");
      setMessage(`This code belongs to a different business (${claim.listings?.business_name}).`);
      return;
    }

    const res = await fetch("/api/mark-picked-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: claim.listing_id, claimId: claim.id }),
    });
    const data = await res.json();

    if (data.success) {
      setStatus("success");
      const qty = claim.quantity_claimed || 1;
      setMessage(`✅ ${claim.first_name} picked up ${qty > 1 ? `${qty} portions of ` : ""}${claim.listings?.food_name || "food"}!`);
      setTimeout(() => {
        setStatus("idle");
        setMessage("");
        setLastCode("");
        startCamera();
      }, 4000);
    } else {
      setStatus("error");
      setMessage(data.error || "Failed to mark as picked up. Please try from the dashboard.");
    }
  }

  if (!authOk) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <p style={{ color: "#6b7280" }}>Loading...</p>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0a2e1a", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", padding: "24px 16px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ width: "100%", maxWidth: "480px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#fff" }}>📷 QR Scanner</h1>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#a3c9b0" }}>
              {bizName || "Scan customer pickup code"}
            </p>
          </div>
          <a href="/business/dashboard"
            style={{ background: "#166534", color: "#4ade80", border: "1px solid #166534", padding: "8px 16px", borderRadius: "8px", textDecoration: "none", fontSize: "13px", fontWeight: 700 }}>
            ← Dashboard
          </a>
        </div>

        {/* Camera viewfinder */}
        <div style={{ position: "relative", borderRadius: "16px", overflow: "hidden", background: "#000", aspectRatio: "1", marginBottom: "20px", border: status === "scanning" ? "3px solid #4ade80" : "3px solid #166534" }}>
          <video
            ref={videoRef}
            playsInline
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover", display: status === "scanning" ? "block" : "none" }}
          />
          <canvas ref={canvasRef} style={{ display: "none" }} />

          {status !== "scanning" && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px" }}>
              <div style={{ fontSize: "64px" }}>
                {status === "success" ? "✅" : status === "error" ? "❌" : "📷"}
              </div>
            </div>
          )}

          {status === "scanning" && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <div style={{ width: "200px", height: "200px", border: "3px solid #4ade80", borderRadius: "12px", boxShadow: "0 0 0 2000px rgba(0,0,0,0.35)" }}/>
            </div>
          )}
        </div>

        {/* Status message */}
        {message && (
          <div style={{
            background: status === "success" ? "#166534" : status === "error" ? "#7f1d1d" : "#1f2937",
            border: `1px solid ${status === "success" ? "#4ade80" : status === "error" ? "#ef4444" : "#374151"}`,
            borderRadius: "12px", padding: "16px 20px", marginBottom: "16px",
          }}>
            <p style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#fff", lineHeight: 1.5 }}>{message}</p>
          </div>
        )}

        {/* Buttons */}
        {status === "idle" && (
          <button
            onClick={startCamera}
            style={{ width: "100%", background: "#16a34a", color: "#fff", border: "none", borderRadius: "12px", padding: "16px", fontSize: "17px", fontWeight: 800, cursor: "pointer" }}>
            📷 Start Scanning
          </button>
        )}

        {status === "scanning" && (
          <button
            onClick={stopCamera}
            style={{ width: "100%", background: "#374151", color: "#fff", border: "none", borderRadius: "12px", padding: "16px", fontSize: "17px", fontWeight: 800, cursor: "pointer" }}>
            ✕ Stop
          </button>
        )}

        {status === "error" && (
          <button
            onClick={() => { setStatus("idle"); setMessage(""); setLastCode(""); }}
            style={{ width: "100%", background: "#16a34a", color: "#fff", border: "none", borderRadius: "12px", padding: "16px", fontSize: "17px", fontWeight: 800, cursor: "pointer" }}>
            Try Again
          </button>
        )}

        <p style={{ margin: "20px 0 0", fontSize: "12px", color: "#6b7280", textAlign: "center", lineHeight: 1.6 }}>
          No QR code? Use the dashboard to mark pickups manually.
        </p>

      </div>
    </div>
  );
}
