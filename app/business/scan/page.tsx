"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import jsQR from "jsqr";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type ClaimPreview = {
  claimId: string;
  listingId: string;
  firstName: string;
  foodName: string;
  qty: number;
  code: string;
};

export default function ScanPage() {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [scanning, setScanning]         = useState(false);
  const [authOk, setAuthOk]             = useState(false);
  const [bizName, setBizName]           = useState<string | null>(null);
  const [preview, setPreview]           = useState<ClaimPreview | null>(null);
  const [confirming, setConfirming]     = useState(false);
  const [errorMsg, setErrorMsg]         = useState("");
  const [successMsg, setSuccessMsg]     = useState("");
  const [lastScanned, setLastScanned]   = useState("");

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
    setPreview(null);
    setErrorMsg("");
    setSuccessMsg("");
    setLastScanned("");
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      intervalRef.current = setInterval(scanFrame, 300);
    } catch {
      setScanning(false);
      setErrorMsg("Camera access denied. Please allow camera access and try again.");
    }
  }

  function stopCamera() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setScanning(false);
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
    if (result?.data && result.data !== lastScanned) {
      setLastScanned(result.data);
      lookupCode(result.data);
    }
  }

  // QR scanned → look up the claim and show a preview card. Do NOT mark picked up yet.
  async function lookupCode(code: string) {
    stopCamera();
    setErrorMsg("");
    setSuccessMsg("");

    const { data: claims, error } = await supabase
      .from("claims")
      .select("id, listing_id, first_name, quantity_claimed, status, listings(food_name, business_name)")
      .eq("confirmation_code", code)
      .eq("status", "active");

    if (error || !claims || claims.length === 0) {
      setErrorMsg(`No active claim found for code "${code}". It may already be picked up, cancelled, or invalid.`);
      return;
    }

    const claim = claims[0] as any;

    if (bizName && claim.listings?.business_name !== bizName) {
      setErrorMsg(`This code belongs to a different business (${claim.listings?.business_name}).`);
      return;
    }

    // Show the claim details — business taps Confirm to actually mark picked up
    setPreview({
      claimId:   claim.id,
      listingId: claim.listing_id,
      firstName: claim.first_name,
      foodName:  claim.listings?.food_name || "Food",
      qty:       claim.quantity_claimed || 1,
      code,
    });
  }

  // Business taps Confirm Pickup — NOW we mark it picked up
  async function confirmPickup() {
    if (!preview) return;
    setConfirming(true);
    const res = await fetch("/api/mark-picked-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: preview.listingId, claimId: preview.claimId }),
    });
    const data = await res.json();
    setConfirming(false);
    if (data.success) {
      setPreview(null);
      setSuccessMsg(`✅ ${preview.firstName} picked up ${preview.qty > 1 ? `${preview.qty} portions of ` : ""}${preview.foodName}!`);
      // Auto-restart scanner after 3s so staff can scan the next customer
      setTimeout(() => {
        setSuccessMsg("");
        startCamera();
      }, 3000);
    } else {
      setPreview(null);
      setErrorMsg(data.error || "Failed to mark as picked up. Please try from the dashboard.");
    }
  }

  function dismissPreview() {
    setPreview(null);
    setLastScanned("");
    startCamera();
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
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

        {/* Camera viewfinder — only shown while scanning */}
        {!preview && !successMsg && (
          <div style={{ position: "relative", borderRadius: "16px", overflow: "hidden", background: "#000", aspectRatio: "1", marginBottom: "20px", border: scanning ? "3px solid #4ade80" : "3px solid #166534" }}>
            <video
              ref={videoRef}
              playsInline
              muted
              style={{ width: "100%", height: "100%", objectFit: "cover", display: scanning ? "block" : "none" }}
            />
            <canvas ref={canvasRef} style={{ display: "none" }} />

            {!scanning && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontSize: "64px" }}>📷</div>
              </div>
            )}

            {scanning && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                <div style={{ width: "200px", height: "200px", border: "3px solid #4ade80", borderRadius: "12px", boxShadow: "0 0 0 2000px rgba(0,0,0,0.4)" }}/>
              </div>
            )}

            {scanning && (
              <div style={{ position: "absolute", bottom: "16px", left: 0, right: 0, textAlign: "center" }}>
                <span style={{ background: "rgba(0,0,0,0.6)", color: "#4ade80", fontSize: "13px", fontWeight: 700, padding: "6px 14px", borderRadius: "20px" }}>
                  Point at customer QR code
                </span>
              </div>
            )}
          </div>
        )}

        {/* SUCCESS message */}
        {successMsg && !preview && (
          <div style={{ background: "#166534", border: "2px solid #4ade80", borderRadius: "16px", padding: "28px 24px", marginBottom: "20px", textAlign: "center" }}>
            <div style={{ fontSize: "56px", marginBottom: "12px" }}>✅</div>
            <p style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#fff", lineHeight: 1.4 }}>{successMsg}</p>
            <p style={{ margin: "10px 0 0", fontSize: "13px", color: "#a3c9b0" }}>Scanner restarting...</p>
          </div>
        )}

        {/* ERROR message */}
        {errorMsg && !preview && (
          <div style={{ background: "#7f1d1d", border: "1.5px solid #ef4444", borderRadius: "14px", padding: "20px", marginBottom: "16px" }}>
            <p style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#fff", lineHeight: 1.5 }}>{errorMsg}</p>
          </div>
        )}

        {/* ── CLAIM PREVIEW CARD ─────────────────────────────────────────
            Shown after a QR code is scanned. Business reviews and confirms.
            This is the key UX: scan shows info, business taps to confirm.
        ────────────────────────────────────────────────────────────────── */}
        {preview && (
          <div style={{ background: "#fff", borderRadius: "20px", padding: "28px 24px", marginBottom: "20px" }}>

            {/* Code badge */}
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <p style={{ margin: "0 0 6px", fontSize: "12px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.6px" }}>Pickup Code</p>
              <div style={{ fontFamily: "monospace", fontSize: "36px", fontWeight: 900, letterSpacing: "8px", color: "#0a2e1a", background: "#f0fdf4", border: "2px solid #bbf7d0", borderRadius: "12px", padding: "14px 10px", display: "inline-block" }}>
                {preview.code}
              </div>
            </div>

            {/* Claim details */}
            <div style={{ background: "#f9fafb", borderRadius: "12px", padding: "16px 18px", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <p style={{ margin: 0, fontSize: "22px", fontWeight: 900, color: "#0a2e1a" }}>{preview.firstName}</p>
                {preview.qty > 1 && (
                  <span style={{ background: "#2563eb", color: "#fff", fontSize: "13px", fontWeight: 700, padding: "4px 12px", borderRadius: "20px" }}>
                    {preview.qty} portions
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: "16px", color: "#374151", fontWeight: 600 }}>🍽️ {preview.foodName}</p>
            </div>

            {/* Confirm button — this is what actually marks it picked up */}
            <button
              onClick={confirmPickup}
              disabled={confirming}
              style={{ width: "100%", background: confirming ? "#9ca3af" : "#16a34a", color: "#fff", border: "none", borderRadius: "12px", padding: "18px", fontSize: "18px", fontWeight: 900, cursor: confirming ? "not-allowed" : "pointer", marginBottom: "10px" }}>
              {confirming ? "Confirming..." : "✅ Confirm Pickup"}
            </button>

            {/* Not this person? Scan again */}
            <button
              onClick={dismissPreview}
              disabled={confirming}
              style={{ width: "100%", background: "none", color: "#6b7280", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "12px", fontSize: "14px", fontWeight: 600, cursor: confirming ? "not-allowed" : "pointer" }}>
              ✕ Not this person — Scan again
            </button>
          </div>
        )}

        {/* Start / Stop buttons */}
        {!preview && !successMsg && (
          <>
            {!scanning && (
              <button
                onClick={startCamera}
                style={{ width: "100%", background: "#16a34a", color: "#fff", border: "none", borderRadius: "12px", padding: "16px", fontSize: "17px", fontWeight: 800, cursor: "pointer" }}>
                📷 {errorMsg ? "Try Again" : "Start Scanning"}
              </button>
            )}
            {scanning && (
              <button
                onClick={stopCamera}
                style={{ width: "100%", background: "#374151", color: "#fff", border: "none", borderRadius: "12px", padding: "16px", fontSize: "17px", fontWeight: 800, cursor: "pointer" }}>
                ✕ Stop
              </button>
            )}
          </>
        )}

        <p style={{ margin: "20px 0 0", fontSize: "12px", color: "#4b7c5e", textAlign: "center", lineHeight: 1.6 }}>
          No QR code? Use the dashboard to mark pickups manually.
        </p>

      </div>
    </div>
  );
}
