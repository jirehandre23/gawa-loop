"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function CancelContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const code = searchParams.get("code");

  const [status, setStatus] = useState<"loading" | "success" | "already" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!id || !code) {
      setStatus("error");
      setMessage("Invalid cancellation link. Please check your email.");
      return;
    }

    fetch(`/api/cancel-claim?id=${id}&code=${code}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStatus("success");
          setMessage(data.message || "Your reservation has been cancelled.");
        } else if (data.already) {
          setStatus("already");
          setMessage("This reservation was already cancelled.");
        } else {
          setStatus("error");
          setMessage(data.error || "Something went wrong. Please try again.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Network error. Please try again.");
      });
  }, [id, code]);

  const icon = {
    loading: "⏳",
    success: "✅",
    already: "ℹ️",
    error: "❌",
  }[status];

  const bgColor = {
    loading: "#f9fafb",
    success: "#f0fdf4",
    already: "#eff6ff",
    error: "#fef2f2",
  }[status];

  const borderColor = {
    loading: "#e5e7eb",
    success: "#16a34a",
    already: "#3b82f6",
    error: "#ef4444",
  }[status];

  const textColor = {
    loading: "#374151",
    success: "#166534",
    already: "#1e40af",
    error: "#991b1b",
  }[status];

  const title = {
    loading: "Cancelling your reservation...",
    success: "Reservation Cancelled",
    already: "Already Cancelled",
    error: "Something Went Wrong",
  }[status];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f9fafb",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding: "24px",
    }}>
      <div style={{
        background: bgColor,
        border: `2px solid ${borderColor}`,
        borderRadius: "20px",
        padding: "48px 40px",
        maxWidth: "460px",
        width: "100%",
        textAlign: "center",
        boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
      }}>
        {/* Logo */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          marginBottom: "32px",
        }}>
          <img
            src="/gawa-logo-green.png"
            alt="GAWA Loop"
            style={{ width: "40px", height: "40px", objectFit: "contain" }}
          />
          <span style={{ fontWeight: 800, fontSize: "20px", color: "#0a2e1a" }}>
            GAWA Loop
          </span>
        </div>

        {/* Icon */}
        <div style={{ fontSize: "56px", marginBottom: "16px", lineHeight: 1 }}>
          {icon}
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: "24px",
          fontWeight: 800,
          color: textColor,
          margin: "0 0 12px",
        }}>
          {title}
        </h1>

        {/* Message */}
        <p style={{
          fontSize: "15px",
          color: textColor,
          lineHeight: 1.6,
          margin: "0 0 32px",
          opacity: 0.85,
        }}>
          {status === "loading" ? "Please wait a moment..." : message}
        </p>

        {/* Extra message for success */}
        {status === "success" && (
          <p style={{
            fontSize: "13px",
            color: "#6b7280",
            background: "rgba(0,0,0,0.04)",
            borderRadius: "10px",
            padding: "12px 16px",
            marginBottom: "28px",
            lineHeight: 1.6,
          }}>
            The food listing has been released back and is now available for someone else to claim. Thank you for letting us know!
          </p>
        )}

        {/* Back to browse button */}
        {status !== "loading" && (
          <a
            href="/browse"
            style={{
              display: "inline-block",
              background: "#16a34a",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "15px",
              padding: "14px 32px",
              borderRadius: "12px",
              textDecoration: "none",
              boxShadow: "0 4px 12px rgba(22,163,74,0.25)",
            }}
          >
            Browse Free Food Near Me
          </a>
        )}

        {/* Footer */}
        <p style={{
          fontSize: "12px",
          color: "#9ca3af",
          marginTop: "28px",
        }}>
          gawaloop.com · Free food. Less waste. Real impact.
        </p>
      </div>
    </div>
  );
}

export default function CancelClaimPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "sans-serif",
        fontSize: "16px",
        color: "#6b7280",
      }}>
        Loading...
      </div>
    }>
      <CancelContent />
    </Suspense>
  );
}
