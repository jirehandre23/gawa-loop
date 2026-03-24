"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function CancelContent() {
  const params = useSearchParams();
  const id = params.get("id");
  const code = params.get("code");
  const [status, setStatus] = useState<"loading"|"success"|"already"|"expired"|"error">("loading");
  const [info, setInfo] = useState<{food?:string;business?:string}>({});

  useEffect(() => {
    if (!id || !code) { setStatus("error"); return; }
    fetch(`/api/cancel-claim?id=${encodeURIComponent(id)}&code=${encodeURIComponent(code)}`)
      .then(r => r.json())
      .then(d => {
        setInfo({ food: d.food, business: d.business });
        if (d.success)      setStatus("success");
        else if (d.already) setStatus("already");
        else if (d.expired) setStatus("expired");
        else                setStatus("error");
      })
      .catch(() => setStatus("error"));
  }, [id, code]);

  const cfg: Record<string,{icon:string;title:string;color:string;bg:string;border:string}> = {
    loading: {icon:"⏳",title:"Cancelling...",                 color:"#374151",bg:"#f9fafb",border:"#e5e7eb"},
    success: {icon:"✅",title:"Reservation Cancelled",          color:"#166534",bg:"#f0fdf4",border:"#16a34a"},
    already: {icon:"ℹ️",title:"Already Cancelled",              color:"#1e40af",bg:"#eff6ff",border:"#3b82f6"},
    expired: {icon:"⏰",title:"Listing Expired",                color:"#92400e",bg:"#fffbeb",border:"#f59e0b"},
    error:   {icon:"❌",title:"Something Went Wrong",           color:"#991b1b",bg:"#fef2f2",border:"#ef4444"},
  };
  const c = cfg[status];
  const msg: Record<string,string> = {
    loading: "Please wait...",
    success: `Your reservation for ${info.food||"food"} at ${info.business||"the business"} has been cancelled. It is now available for someone else.`,
    already: "This reservation was already cancelled.",
    expired: "This listing has already expired — no action needed.",
    error:   "Invalid or expired cancellation link.",
  };

  return (
    <div style={{minHeight:"100vh",background:"#f9fafb",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",padding:"24px"}}>
      <div style={{background:c.bg,border:`2px solid ${c.border}`,borderRadius:"20px",padding:"48px 40px",maxWidth:"460px",width:"100%",textAlign:"center",boxShadow:"0 8px 32px rgba(0,0,0,0.08)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"10px",marginBottom:"32px"}}>
          <img src="/gawa-logo-green.png" alt="GAWA Loop" style={{width:"40px",height:"40px",objectFit:"contain"}}/>
          <span style={{fontWeight:800,fontSize:"20px",color:"#0a2e1a"}}>GAWA Loop</span>
        </div>
        <div style={{fontSize:"56px",marginBottom:"16px",lineHeight:1}}>{c.icon}</div>
        <h1 style={{fontSize:"24px",fontWeight:800,color:c.color,margin:"0 0 12px"}}>{c.title}</h1>
        <p style={{fontSize:"15px",color:c.color,lineHeight:1.6,margin:"0 0 32px",opacity:0.85}}>{msg[status]}</p>
        {status !== "loading" && (
          <a href="/browse" style={{display:"inline-block",background:"#16a34a",color:"#fff",fontWeight:700,fontSize:"15px",padding:"14px 32px",borderRadius:"12px",textDecoration:"none"}}>
            Browse Free Food Near Me
          </a>
        )}
        <p style={{fontSize:"12px",color:"#9ca3af",marginTop:"28px"}}>gawaloop.com · Free food. Less waste. Real impact.</p>
      </div>
    </div>
  );
}

export default function CancelClaimPage() {
  return (
    <Suspense fallback={<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:"#6b7280"}}>Loading...</div>}>
      <CancelContent />
    </Suspense>
  );
}
