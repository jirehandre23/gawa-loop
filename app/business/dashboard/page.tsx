"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Only this one special account can access any business
const ADMIN_EMAIL = "admin@gawaloop.com";

const TERMINAL = ["PICKED_UP", "EXPIRED", "CANCELLED"];

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  AVAILABLE: { bg: "#16a34a", text: "#fff" },
  RESERVED:  { bg: "#2563eb", text: "#fff" },
  PICKED_UP: { bg: "#7c3aed", text: "#fff" },
  EXPIRED:   { bg: "#9ca3af", text: "#fff" },
  CANCELLED: { bg: "#ef4444", text: "#fff" },
};

type Claim = {
  id: string; first_name: string; email: string; phone: string;
  eta_minutes: number; confirmation_code: string; reserved_until: string; status: string;
};
type Listing = {
  id: string; food_name: string; category: string; quantity: string;
  address: string; allergy_note: string; estimated_value: number; note: string;
  status: string; expires_at: string; created_at: string; reserved_until: string;
  claim_code: string; claims?: Claim[];
};

const EMPTY_FORM = {
  food_name: "", category: "Food", quantity: "", allergy_note: "",
  estimated_value: "", note: "", active_hours: "1", claim_hold: "10",
};

export default function BusinessDashboard() {
  const [listings, setListings]       = useState<Listing[]>([]);
  const [businessName, setBusiness]   = useState<string | null>(null);
  const [businessAddress, setAddress] = useState("");
  const [loading, setLoading]         = useState(true);
  const [isAdmin, setIsAdmin]         = useState(false);
  const [adminView, setAdminView]     = useState<string | null>(null);
  const [allBizNames, setAllBizNames] = useState<string[]>([]);
  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [posting, setPosting]         = useState(false);
  const [postMsg, setPostMsg]         = useState("");

  async function loadDashboard(adminTarget?: string | null) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/business/login"; return; }

    const email = user.email || "";
    const admin = email === ADMIN_EMAIL;
    setIsAdmin(admin);

    if (admin) {
      // Admin: load all business names for the dropdown
      const { data } = await supabase
        .from("listings")
        .select("business_name")
        .order("business_name");
      const unique = [...new Set(
        (data || []).map((b: any) => b.business_name).filter(Boolean)
      )] as string[];
      setAllBizNames(unique);
    }

    // Find business for this user
    const { data: biz } = await supabase
      .from("businesses")
      .select("name, address")
      .eq("email", email)
      .single();

    // Admin uses dropdown selection; regular user uses their own business
    const bName = admin ? (adminTarget ?? unique_first(allBizNames)) : (biz?.name ?? null);
    setBusiness(bName);
    setAddress(biz?.address || "");

    if (bName) {
      const { data } = await supabase
        .from("listings")
        .select("*, claims(*)")
        .eq("business_name", bName)
        .order("created_at", { ascending: false });
      setListings(data || []);
    } else if (!admin) {
      setListings([]);
    }

    setLoading(false);
  }

  function unique_first(arr: string[]) { return arr.length > 0 ? arr[0] : null; }

  useEffect(() => { loadDashboard(adminView); }, [adminView]);

  // Stats
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear  = now.getFullYear();
  const monthlyL  = listings.filter(l => { const d = new Date(l.created_at); return d.getMonth()===thisMonth && d.getFullYear()===thisYear; });
  const yearlyL   = listings.filter(l => new Date(l.created_at).getFullYear() === thisYear);
  const mValue    = monthlyL.reduce((s,l) => s + Number(l.estimated_value||0), 0);
  const yValue    = yearlyL.reduce((s,l) => s + Number(l.estimated_value||0), 0);
  const mPickups  = monthlyL.filter(l => l.status==="PICKED_UP").length;
  const yPickups  = yearlyL.filter(l => l.status==="PICKED_UP").length;

  async function handlePickedUp(id: string) {
    await supabase.from("listings").update({ status: "PICKED_UP" }).eq("id", id);
    setListings(prev => prev.map(l => l.id===id ? {...l, status:"PICKED_UP"} : l));
  }

  async function handleCancelReservation(id: string) {
    await supabase.from("listings")
      .update({ status: "AVAILABLE", reserved_until: null, claim_code: null })
      .eq("id", id);
    setListings(prev => prev.map(l => l.id===id ? {...l, status:"AVAILABLE", reserved_until:null as any, claim_code:null as any} : l));
  }

  async function handleCancelListing(id: string) {
    if (!confirm("Cancel this listing? It will be removed from the browse page.")) return;
    await supabase.from("listings").update({ status: "CANCELLED" }).eq("id", id);
    setListings(prev => prev.map(l => l.id===id ? {...l, status:"CANCELLED"} : l));
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!businessName) return;
    setPosting(true); setPostMsg("");
    const expiresAt = new Date(Date.now() + Number(form.active_hours)*60*60*1000).toISOString();
    const { error } = await supabase.from("listings").insert({
      business_name: businessName,
      address: businessAddress,
      food_name: form.food_name,
      category: form.category,
      quantity: form.quantity,
      allergy_note: form.allergy_note || null,
      estimated_value: form.estimated_value ? Number(form.estimated_value) : null,
      note: form.note || null,
      status: "AVAILABLE",
      expires_at: expiresAt,
      claim_hold_minutes: Number(form.claim_hold),
    });
    if (error) {
      setPostMsg("Error posting. Please try again.");
    } else {
      setPostMsg("Food posted successfully! ✅");
      setForm(EMPTY_FORM);
      setShowForm(false);
      loadDashboard(adminView);
    }
    setPosting(false);
  }

  if (loading) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"sans-serif"}}>
      Loading dashboard...
    </div>
  );

  const inp: React.CSSProperties = {
    width:"100%", padding:"10px 14px", borderRadius:"8px",
    border:"1px solid #e5e7eb", fontSize:"14px", boxSizing:"border-box",
    outline:"none", background:"#fff",
  };
  const lbl: React.CSSProperties = {
    display:"block", fontSize:"13px", fontWeight:600, color:"#374151", marginBottom:"4px"
  };

  return (
    <div style={{minHeight:"100vh", background:"#f9fafb", fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", padding:"24px 16px"}}>
      <div style={{maxWidth:"780px", margin:"0 auto"}}>

        {/* Header */}
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"28px", flexWrap:"wrap", gap:"12px"}}>
          <div style={{display:"flex", alignItems:"center", gap:"12px"}}>
            <img src="/gawa-logo-green.png" alt="GAWA Loop" style={{width:"42px",height:"42px",objectFit:"contain"}}/>
            <div>
              <h1 style={{margin:0, fontSize:"20px", fontWeight:800, color:"#0a2e1a"}}>Business Dashboard</h1>
              <p style={{margin:0, fontSize:"13px", color:"#6b7280"}}>
                {isAdmin ? (adminView || "Select a business below") : (businessName || "No business linked")}
                {isAdmin && (
                  <span style={{marginLeft:"8px", background:"#0a2e1a", color:"#4ade80", fontSize:"11px", fontWeight:700, padding:"2px 8px", borderRadius:"6px"}}>
                    🔑 ADMIN
                  </span>
                )}
              </p>
            </div>
          </div>
          <div style={{display:"flex", gap:"10px", flexWrap:"wrap", alignItems:"center"}}>
            {/* Admin-only business switcher */}
            {isAdmin && (
              <select
                value={adminView || ""}
                onChange={e => { setAdminView(e.target.value || null); }}
                style={{padding:"8px 14px", borderRadius:"8px", border:"2px solid #0a2e1a", fontSize:"14px", background:"#f0fdf4", cursor:"pointer", fontWeight:600, color:"#0a2e1a"}}
              >
                <option value="">— Select Business —</option>
                {allBizNames.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            )}
            <button
              onClick={() => { setShowForm(true); setPostMsg(""); }}
              style={{background:"#16a34a", color:"#fff", border:"none", padding:"10px 18px", borderRadius:"8px", cursor:"pointer", fontSize:"14px", fontWeight:700}}
            >
              + New Listing
            </button>
            <button
              onClick={async () => { await supabase.auth.signOut(); window.location.href = "/business/login"; }}
              style={{background:"#f3f4f6", color:"#374151", border:"1px solid #e5e7eb", padding:"10px 16px", borderRadius:"8px", cursor:"pointer", fontSize:"14px", fontWeight:600}}
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* New Listing Form */}
        {showForm && (
          <div style={{background:"#fff", border:"1px solid #e5e7eb", borderRadius:"16px", padding:"28px", marginBottom:"24px", boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px"}}>
              <h2 style={{margin:0, fontSize:"18px", fontWeight:800, color:"#0a2e1a"}}>Post Available Food</h2>
              <button onClick={() => setShowForm(false)} style={{background:"none", border:"none", fontSize:"20px", cursor:"pointer", color:"#9ca3af"}}>✕</button>
            </div>
            <form onSubmit={handlePost}>
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px"}}>
                <div style={{gridColumn:"1/-1"}}>
                  <label style={lbl}>Business Name</label>
                  <input style={{...inp, background:"#f9fafb", color:"#6b7280"}} value={businessName||""} disabled/>
                </div>
                <div style={{gridColumn:"1/-1"}}>
                  <label style={lbl}>Pickup Address</label>
                  <input style={{...inp, background:"#f9fafb", color:"#6b7280"}} value={businessAddress||""} disabled/>
                </div>
                <div style={{gridColumn:"1/-1"}}>
                  <label style={lbl}>Exact food name *</label>
                  <input style={inp} placeholder="e.g. Chicken sandwich, vegetarian pasta" required
                    value={form.food_name} onChange={e => setForm(f=>({...f,food_name:e.target.value}))}/>
                </div>
                <div>
                  <label style={lbl}>Category *</label>
                  <select style={{...inp, cursor:"pointer"}} value={form.category} onChange={e => setForm(f=>({...f,category:e.target.value}))}>
                    <option>Food</option><option>Bakery</option><option>Beverages</option>
                    <option>Prepared Meals</option><option>Produce</option><option>Other</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Quantity *</label>
                  <input style={inp} placeholder="e.g. 10 meals" required
                    value={form.quantity} onChange={e => setForm(f=>({...f,quantity:e.target.value}))}/>
                </div>
                <div style={{gridColumn:"1/-1"}}>
                  <label style={lbl}>Allergy / dietary note</label>
                  <input style={inp} placeholder="e.g. contains dairy, nuts, halal, vegetarian"
                    value={form.allergy_note} onChange={e => setForm(f=>({...f,allergy_note:e.target.value}))}/>
                </div>
                <div>
                  <label style={lbl}>Estimated value ($)</label>
                  <input style={inp} type="number" min="0" step="0.01" placeholder="e.g. 30"
                    value={form.estimated_value} onChange={e => setForm(f=>({...f,estimated_value:e.target.value}))}/>
                </div>
                <div>
                  <label style={lbl}>Keep listing active for</label>
                  <select style={{...inp, cursor:"pointer"}} value={form.active_hours} onChange={e => setForm(f=>({...f,active_hours:e.target.value}))}>
                    <option value="0.5">30 minutes</option>
                    <option value="1">1 hour</option>
                    <option value="2">2 hours</option>
                    <option value="4">4 hours</option>
                    <option value="8">8 hours</option>
                  </select>
                </div>
                <div style={{gridColumn:"1/-1"}}>
                  <label style={lbl}>Hold item after claim for</label>
                  <select style={{...inp, cursor:"pointer"}} value={form.claim_hold} onChange={e => setForm(f=>({...f,claim_hold:e.target.value}))}>
                    <option value="10">10 minutes</option><option value="15">15 minutes</option>
                    <option value="20">20 minutes</option><option value="30">30 minutes</option>
                    <option value="45">45 minutes</option><option value="60">1 hour</option>
                  </select>
                </div>
                <div style={{gridColumn:"1/-1"}}>
                  <label style={lbl}>Short note</label>
                  <textarea style={{...inp, height:"80px", resize:"vertical"}} placeholder="e.g. Pickup before closing"
                    value={form.note} onChange={e => setForm(f=>({...f,note:e.target.value}))}/>
                </div>
              </div>
              {postMsg && (
                <p style={{margin:"12px 0 0", fontSize:"14px", color:postMsg.includes("✅")?"#16a34a":"#ef4444", fontWeight:600}}>
                  {postMsg}
                </p>
              )}
              <button type="submit" disabled={posting}
                style={{marginTop:"20px", background:posting?"#9ca3af":"#16a34a", color:"#fff", border:"none", padding:"12px 28px", borderRadius:"10px", cursor:posting?"not-allowed":"pointer", fontSize:"15px", fontWeight:700}}>
                {posting ? "Posting..." : "Post Food"}
              </button>
            </form>
          </div>
        )}

        {/* Impact Summary */}
        <div style={{background:"#fff", border:"1px solid #e5e7eb", borderRadius:"16px", padding:"24px 28px", marginBottom:"24px"}}>
          <h2 style={{margin:"0 0 16px", fontSize:"17px", fontWeight:800, color:"#0a2e1a"}}>📊 Impact Summary</h2>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px"}}>
            {[
              { label: `This Month (${now.toLocaleString("default",{month:"long"})})`, items: [
                { k:"Listings posted",    v: monthlyL.length },
                { k:"Pickups completed",  v: mPickups },
                { k:"Estimated value",    v: `$${mValue.toFixed(2)}` },
              ]},
              { label: `This Year (${thisYear})`, items: [
                { k:"Listings posted",    v: yearlyL.length },
                { k:"Pickups completed",  v: yPickups },
                { k:"Estimated value",    v: `$${yValue.toFixed(2)}` },
              ]},
            ].map(section => (
              <div key={section.label} style={{background:"#f9fafb", borderRadius:"12px", padding:"16px 20px", border:"1px solid #e5e7eb"}}>
                <p style={{margin:"0 0 12px", fontSize:"12px", fontWeight:700, color:"#6b7280", textTransform:"uppercase", letterSpacing:"0.8px"}}>{section.label}</p>
                {section.items.map(item => (
                  <div key={item.k} style={{display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:"1px solid #f0f0f0"}}>
                    <span style={{fontSize:"13px", color:"#374151"}}>{item.k}</span>
                    <span style={{fontSize:"14px", fontWeight:700, color:"#0a2e1a"}}>{item.v}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <p style={{margin:"12px 0 0", fontSize:"12px", color:"#9ca3af"}}>For recordkeeping and operational reporting.</p>
        </div>

        {/* Listings */}
        <h2 style={{fontSize:"17px", fontWeight:800, color:"#0a2e1a", marginBottom:"14px"}}>Your Listings</h2>

        {listings.length === 0 ? (
          <div style={{background:"#fff", border:"1px solid #e5e7eb", borderRadius:"12px", padding:"40px", textAlign:"center"}}>
            <p style={{color:"#6b7280", marginBottom:"16px"}}>
              {isAdmin && !adminView ? "Select a business above to view its listings." : "No listings yet. Post your first one!"}
            </p>
            {(!isAdmin || adminView) && (
              <button onClick={() => setShowForm(true)}
                style={{background:"#16a34a", color:"#fff", border:"none", padding:"12px 24px", borderRadius:"8px", cursor:"pointer", fontWeight:600}}>
                + Post Food Now
              </button>
            )}
          </div>
        ) : listings.map(listing => {
          const isTerminal  = TERMINAL.includes(listing.status);
          const isReserved  = listing.status === "RESERVED";
          const isAvailable = listing.status === "AVAILABLE";
          const sc = STATUS_COLOR[listing.status] || { bg:"#6b7280", text:"#fff" };
          const activeClaim    = listing.claims?.find(c => c.status === "active");
          const anyCompleteClaim = listing.claims?.find(c => c.status === "active");

          return (
            <div key={listing.id} style={{background:"#fff", border:"1px solid #e5e7eb", borderRadius:"16px", padding:"24px", marginBottom:"16px", opacity:isTerminal?0.88:1}}>

              {/* Title + badge */}
              <div style={{display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"14px", gap:"12px"}}>
                <h3 style={{margin:0, fontSize:"18px", fontWeight:800, color:"#0a2e1a"}}>{listing.food_name || "Unnamed food"}</h3>
                <span style={{background:sc.bg, color:sc.text, fontSize:"12px", fontWeight:700, padding:"5px 14px", borderRadius:"20px", flexShrink:0}}>
                  {listing.status}
                </span>
              </div>

              {/* Details — always fully visible */}
              <div style={{fontSize:"14px", color:"#1f2937", lineHeight:"1.9"}}>
                <p style={{margin:"2px 0"}}><b>Category:</b> {listing.category || "N/A"}</p>
                <p style={{margin:"2px 0"}}><b>Quantity:</b> {listing.quantity || "N/A"}</p>
                <p style={{margin:"2px 0"}}><b>Address:</b> {listing.address || "N/A"}</p>
                <p style={{margin:"2px 0"}}><b>Allergy note:</b> {listing.allergy_note || "None"}</p>
                <p style={{margin:"2px 0"}}><b>Estimated value:</b> ${Number(listing.estimated_value||0).toFixed(2)}</p>
                <p style={{margin:"2px 0"}}><b>Note:</b> {listing.note || "None"}</p>
                <p style={{margin:"2px 0"}}><b>Expires:</b> {listing.expires_at ? new Date(listing.expires_at).toLocaleString() : "N/A"}</p>
                <p style={{margin:"2px 0"}}><b>Posted:</b> {new Date(listing.created_at).toLocaleString()}</p>
              </div>

              {/* Reserved customer */}
              {isReserved && activeClaim && (
                <div style={{background:"#eff6ff", border:"1.5px solid #bfdbfe", borderRadius:"12px", padding:"16px 20px", marginTop:"16px"}}>
                  <p style={{margin:"0 0 10px", fontWeight:700, color:"#1d4ed8", fontSize:"14px"}}>🔒 Reserved Customer Details</p>
                  <div style={{fontSize:"14px", color:"#1e3a5f", lineHeight:"1.9"}}>
                    <p style={{margin:"2px 0"}}><b>Name:</b> {activeClaim.first_name}</p>
                    <p style={{margin:"2px 0"}}><b>Email:</b> {activeClaim.email}</p>
                    <p style={{margin:"2px 0"}}><b>Phone:</b> {activeClaim.phone || "Not provided"}</p>
                    <p style={{margin:"2px 0"}}><b>ETA:</b> {activeClaim.eta_minutes} minutes</p>
                    <p style={{margin:"2px 0"}}><b>Confirmation code:</b> <span style={{fontWeight:800, fontSize:"16px", color:"#2563eb"}}>{activeClaim.confirmation_code}</span></p>
                    <p style={{margin:"2px 0"}}><b>Reserved until:</b> {activeClaim.reserved_until ? new Date(activeClaim.reserved_until).toLocaleString() : "N/A"}</p>
                  </div>
                </div>
              )}

              {/* Picked up by */}
              {listing.status === "PICKED_UP" && anyCompleteClaim && (
                <div style={{background:"#f5f3ff", border:"1.5px solid #ddd6fe", borderRadius:"12px", padding:"16px 20px", marginTop:"16px"}}>
                  <p style={{margin:"0 0 10px", fontWeight:700, color:"#6d28d9", fontSize:"14px"}}>✅ Picked Up By</p>
                  <div style={{fontSize:"14px", color:"#2e1065", lineHeight:"1.9"}}>
                    <p style={{margin:"2px 0"}}><b>Name:</b> {anyCompleteClaim.first_name}</p>
                    <p style={{margin:"2px 0"}}><b>Email:</b> {anyCompleteClaim.email}</p>
                    <p style={{margin:"2px 0"}}><b>Phone:</b> {anyCompleteClaim.phone || "Not provided"}</p>
                    <p style={{margin:"2px 0"}}><b>Code used:</b> <span style={{fontWeight:800, fontSize:"16px", color:"#7c3aed"}}>{anyCompleteClaim.confirmation_code}</span></p>
                  </div>
                </div>
              )}

              {/* Action buttons — only for non-terminal */}
              {!isTerminal && (
                <div style={{display:"flex", gap:"10px", marginTop:"20px", flexWrap:"wrap"}}>
                  {isReserved && (
                    <button onClick={() => handlePickedUp(listing.id)}
                      style={{background:"#16a34a", color:"#fff", border:"none", padding:"10px 20px", borderRadius:"8px", cursor:"pointer", fontWeight:700, fontSize:"14px"}}>
                      ✅ Mark Picked Up
                    </button>
                  )}
                  {isReserved && (
                    <button onClick={() => handleCancelReservation(listing.id)}
                      style={{background:"#f59e0b", color:"#fff", border:"none", padding:"10px 20px", borderRadius:"8px", cursor:"pointer", fontWeight:700, fontSize:"14px"}}>
                      Cancel Reservation
                    </button>
                  )}
                  {(isAvailable || isReserved) && (
                    <button onClick={() => handleCancelListing(listing.id)}
                      style={{background:"#ef4444", color:"#fff", border:"none", padding:"10px 20px", borderRadius:"8px", cursor:"pointer", fontWeight:700, fontSize:"14px"}}>
                      Cancel Listing
                    </button>
                  )}
                </div>
              )}

              {isTerminal && (
                <p style={{marginTop:"14px", fontSize:"13px", color:"#6b7280", fontStyle:"italic"}}>
                  {listing.status==="PICKED_UP" && "✅ Successfully picked up."}
                  {listing.status==="EXPIRED"   && "⏰ This listing has expired."}
                  {listing.status==="CANCELLED" && "❌ This listing was cancelled."}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
