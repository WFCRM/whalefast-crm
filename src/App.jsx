import { useState, useEffect, useCallback, createContext, useContext, useRef } from "react";

// ============================================================
// SUPABASE
// ============================================================
const SUPABASE_URL = "https://tdkppvsnlyqkgxrqmuat.supabase.co";
const SUPABASE_KEY = "sb_publishable_pIWup7aav3nQVtvXXiYFJA_9QimJSIW";

const sbHeaders = (token, extra = {}) => ({
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${token || SUPABASE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
  ...extra,
});

const getToken = () => {
  try { return JSON.parse(localStorage.getItem("wf_session") || "null")?.access_token; }
  catch { return null; }
};

const sb = {
  auth: {
    signIn: async (email, password) => {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error_description || "Login failed");
      return data;
    },
    signOut: () => localStorage.removeItem("wf_session"),
    getSession: () => { try { return JSON.parse(localStorage.getItem("wf_session")); } catch { return null; } },
  },
  get: async (path) => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: sbHeaders(getToken()) });
    if (!res.ok) return [];
    return res.json();
  },
  getCount: async (path) => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { ...sbHeaders(getToken()), Prefer: "count=exact" },
    });
    const cr = res.headers.get("content-range");
    const count = cr ? parseInt(cr.split("/")[1]) || 0 : 0;
    const data = await res.json();
    return { data: Array.isArray(data) ? data : [], count };
  },
  post: async (table, body, opts = "") => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${opts}`, {
      method: "POST", headers: sbHeaders(getToken()), body: JSON.stringify(body),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Insert failed"); }
    return res.json().catch(() => null);
  },
  patch: async (path, body) => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method: "PATCH", headers: sbHeaders(getToken()), body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Update failed");
    return res.json().catch(() => null);
  },
  del: async (path) => {
    return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method: "DELETE", headers: sbHeaders(getToken()),
    });
  },
  upsert: async (table, body) => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=account_code`, {
      method: "POST",
      headers: { ...sbHeaders(getToken()), Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(body),
    });
    return res;
  },
};

// ============================================================
// CONTEXT
// ============================================================
const AuthCtx = createContext(null);
const useAuth = () => useContext(AuthCtx);

// ============================================================
// DESIGN TOKENS
// ============================================================
const C = {
  bg:         "#F5F4F0",
  surface:    "#FFFFFF",
  border:     "#E8E5DE",
  borderFaint:"#F0EDE6",
  ink:        "#1A1916",
  inkMid:     "#6B6860",
  inkFaint:   "#A8A59E",
  green:      "#1B6B4A",
  greenBg:    "#E8F5EE",
  greenDim:   "#0F4A33",
  amber:      "#D97706",
  amberBg:    "#FEF3C7",
  red:        "#DC2626",
  redBg:      "#FEE2E2",
  slate:      "#64748B",
  slateBg:    "#F1F5F9",
  blue:       "#2563EB",
  blueBg:     "#EFF6FF",
  purple:     "#7C3AED",
  purpleBg:   "#EDE9FE",
};
const font = "'DM Sans', 'Noto Sans Thai', sans-serif";

const STATUS = {
  active:     { label: "Active",     dot: "#22C55E", bg: C.greenBg,  text: C.green },
  inactive:   { label: "Inactive",   dot: "#94A3B8", bg: C.slateBg,  text: C.slate },
  lost:       { label: "Lost",       dot: "#EF4444", bg: C.redBg,    text: C.red },
  stop_trade: { label: "Stop Trade", dot: "#F59E0B", bg: C.amberBg,  text: C.amber },
};

// ============================================================
// SHARED COMPONENTS
// ============================================================
function StatusChip({ status }) {
  const m = STATUS[status] || STATUS.inactive;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:11,
      fontWeight:600, padding:"2px 8px", borderRadius:99, background:m.bg, color:m.text,
      letterSpacing:"0.02em", whiteSpace:"nowrap" }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:m.dot, flexShrink:0 }}/>
      {m.label}
    </span>
  );
}

function Btn({ children, onClick, variant="primary", size="md", disabled, style:s }) {
  const base = { border:"none", cursor:disabled?"not-allowed":"pointer", fontFamily:font,
    fontWeight:600, transition:"all 0.15s", borderRadius:8, opacity:disabled?0.5:1 };
  const sizes = { sm:"6px 14px", md:"9px 20px", lg:"11px 28px" };
  const variants = {
    primary: { background:C.green, color:"#fff", fontSize:13 },
    ghost:   { background:"transparent", color:C.inkMid, fontSize:13, border:`1.5px solid ${C.border}` },
    outline: { background:"transparent", color:C.green, fontSize:13, border:`1.5px solid ${C.green}` },
    danger:  { background:C.red, color:"#fff", fontSize:13 },
    "danger-ghost": { background:C.redBg, color:C.red, fontSize:13, border:`1.5px solid ${C.redBg}` },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...base, padding:sizes[size], ...variants[variant], ...s }}>
      {children}
    </button>
  );
}

function Input({ value, onChange, placeholder, type="text", style:s, readOnly }) {
  return (
    <input value={value ?? ""} onChange={onChange} placeholder={placeholder} type={type} readOnly={readOnly}
      style={{ width:"100%", padding:"9px 12px", fontSize:13, border:`1.5px solid ${C.border}`,
        borderRadius:8, background:C.bg, color:C.ink, fontFamily:font, outline:"none",
        boxSizing:"border-box", ...s }}
    />
  );
}

function Label({ children }) {
  return (
    <div style={{ fontSize:11, fontWeight:700, color:C.inkFaint, textTransform:"uppercase",
      letterSpacing:"0.06em", marginBottom:6 }}>
      {children}
    </div>
  );
}

function FieldGroup({ label, children, span=1 }) {
  return (
    <div style={{ gridColumn:`span ${span}` }}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Card({ children, style:s }) {
  return (
    <div style={{ background:C.surface, borderRadius:12, border:`1px solid ${C.border}`,
      padding:"20px 24px", ...s }}>
      {children}
    </div>
  );
}

function Modal({ open, onClose, title, children, width=420 }) {
  if (!open) return null;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:1000,
      display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={onClose}>
      <div style={{ background:C.surface, borderRadius:16, padding:28, width, maxWidth:"90vw",
        boxShadow:"0 20px 60px rgba(0,0,0,0.15)", fontFamily:font }}
        onClick={e => e.stopPropagation()}>
        {title && <h3 style={{ margin:"0 0 16px", fontSize:17, fontWeight:700, color:C.ink }}>{title}</h3>}
        {children}
      </div>
    </div>
  );
}

function Spinner() {
  return <div style={{ textAlign:"center", padding:40, color:C.inkFaint, fontSize:13 }}>กำลังโหลด...</div>;
}

// ============================================================
// SIDEBAR
// ============================================================
const NAV = [
  { key:"customers", label:"ลูกค้า",         icon:"◎" },
  { key:"cost_pricing",label:"ราคาทุนขนส่ง",  icon:"◫" },
  { key:"sell_pricing",label:"ราคาขาย",       icon:"◑" },
  { key:"carriers",    label:"ข้อมูลขนส่ง",   icon:"▷" },
];

function Sidebar({ page, setPage, user, onLogout }) {
  return (
    <div style={{ width:220, background:C.surface, borderRight:`1px solid ${C.border}`,
      height:"100vh", position:"fixed", left:0, top:0, display:"flex",
      flexDirection:"column", zIndex:10, flexShrink:0 }}>
      <div style={{ padding:"24px 20px 20px" }}>
        <div style={{ fontSize:18, fontWeight:700, color:C.green, letterSpacing:"-0.5px" }}>WhaleFast</div>
        <div style={{ fontSize:10, color:C.inkFaint, letterSpacing:"0.12em", textTransform:"uppercase", marginTop:1 }}>CRM</div>
      </div>
      <div style={{ flex:1, padding:"0 10px", overflowY:"auto" }}>
        {NAV.map(item => {
          const active = page === item.key;
          return (
            <div key={item.key} onClick={() => setPage(item.key)}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px",
                borderRadius:8, marginBottom:2, cursor:"pointer", fontSize:13,
                fontWeight: active ? 600 : 400,
                color: active ? C.green : C.inkMid,
                background: active ? C.greenBg : "transparent",
                transition:"all 0.15s" }}>
              <span style={{ fontSize:15, width:18, textAlign:"center", flexShrink:0 }}>{item.icon}</span>
              {item.label}
            </div>
          );
        })}
      </div>
      <div style={{ padding:"16px 16px 20px", borderTop:`1px solid ${C.border}` }}>
        <div style={{ fontSize:13, fontWeight:600, color:C.ink }}>{user?.name || user?.email?.split("@")[0] || "User"}</div>
        <div style={{ fontSize:11, color:C.inkFaint }}>ผู้บริหาร</div>
        <div onClick={onLogout} style={{ fontSize:12, color:C.red, cursor:"pointer", marginTop:8 }}>ออกจากระบบ</div>
      </div>
    </div>
  );
}

// ============================================================
// LOGIN PAGE
// ============================================================
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const data = await sb.auth.signIn(email, password);
      localStorage.setItem("wf_session", JSON.stringify(data));
      onLogin(data);
    } catch (err) {
      setError(err.message === "Invalid login credentials" ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง" : err.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:`linear-gradient(135deg, ${C.green} 0%, ${C.greenDim} 100%)`, fontFamily:font }}>
      <div style={{ background:C.surface, borderRadius:16, padding:"48px 40px",
        width:400, maxWidth:"90vw", boxShadow:"0 24px 64px rgba(0,0,0,0.15)" }}>
        <div style={{ fontSize:28, fontWeight:700, color:C.green, textAlign:"center",
          marginBottom:4, letterSpacing:"-0.5px" }}>WhaleFast</div>
        <div style={{ fontSize:14, color:C.inkFaint, textAlign:"center", marginBottom:32 }}>
          CRM ระบบจัดการข้อมูลองค์กร
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom:16 }}>
            <Label>อีเมล</Label>
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@company.com" type="email" />
          </div>
          <div style={{ marginBottom:24 }}>
            <Label>รหัสผ่าน</Label>
            <Input value={password} onChange={e => setPassword(e.target.value)} placeholder="รหัสผ่าน" type="password" />
          </div>
          {error && (
            <div style={{ background:C.redBg, color:C.red, fontSize:13, padding:"10px 14px",
              borderRadius:8, marginBottom:16 }}>{error}</div>
          )}
          <Btn onClick={handleSubmit} disabled={loading} style={{ width:"100%" }}>
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </Btn>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// CUSTOMERS PAGE
// ============================================================
const FORM_DEFAULTS = {
  account_code:"", account_parent:"CZ0108", customer_name:"", status:"active",
  phone:"", email:"", address:"", business_type:"", product_type:"",
  sales_owner:"", customer_category:"", payment_type:"cash", billing_cycle:"",
  cod_percent:"2", tax_id:"", invoice_name:"", bank_name:"", bank_account:"",
  bank_account_name:"", line_group_id:"", notes:""
};

const FORM_FIELDS = [
  { key:"account_code",    label:"Account Code",    placeholder:"CZ0108-49", half:true },
  { key:"customer_name",   label:"ชื่อลูกค้า",      placeholder:"บริษัท...",  half:true },
  { key:"account_parent",  label:"Account แม่",     placeholder:"CZ0108",    half:true },
  { key:"phone",           label:"เบอร์โทร",         placeholder:"0xx-xxx-xxxx", half:true },
  { key:"email",           label:"อีเมล",            placeholder:"email@...", half:true },
  { key:"sales_owner",     label:"เซลล์",            placeholder:"ชื่อเซลล์", half:true },
  { key:"business_type",   label:"ประเภทธุรกิจ",    placeholder:"ร้านค้าออนไลน์", half:true },
  { key:"cod_percent",     label:"COD %",           placeholder:"2",         half:true },
  { key:"billing_cycle",   label:"รอบชำระ",          placeholder:"เงินสดวางบิลวันถัดไป", half:false },
  { key:"tax_id",          label:"Tax ID",          placeholder:"0000000000000", half:true },
  { key:"invoice_name",    label:"ชื่อออกใบกำกับ",   placeholder:"บริษัท...", half:true },
  { key:"bank_name",       label:"ธนาคาร",           placeholder:"กสิกร",     half:true },
  { key:"bank_account",    label:"เลขบัญชี",         placeholder:"xxx-x-xxxxx-x", half:true },
  { key:"bank_account_name",label:"ชื่อบัญชี",       placeholder:"ชื่อ-นามสกุล", half:true },
  { key:"line_group_id",   label:"LINE Group ID",   placeholder:"Cxxxxxxxx", half:true },
  { key:"status",          label:"สถานะ",             placeholder:"",              half:true },
  { key:"notes",           label:"หมายเหตุ",          placeholder:"เงื่อนไขพิเศษ...", half:false },
];

const FILTER_TABS = [
  { val:"", label:"ทั้งหมด" },
  { val:"active",     label:"Active" },
  { val:"inactive",   label:"Inactive" },
  { val:"lost",       label:"Lost" },
  { val:"stop_trade", label:"Stop Trade" },
];

const CUSTOMER_TABS = [
  { key:"info",      label:"ข้อมูลลูกค้า" },
  { key:"flash",     label:"Flash" },
  { key:"dhl",       label:"DHL" },
  { key:"surcharge", label:"Surcharge" },
  { key:"sender",    label:"Sender" },
];

// ── Pricing Grid (editable) ────────────────────────────────
function PricingGrid({ carrier, zones, pricingTables, pricingRates, setPricingRates, selectedCustomer }) {
  const [editCell, setEditCell] = useState(null);
  const maxKg = carrier === "FLASH" ? 50 : 30;

  const getRate = (tableId, kg) =>
    (pricingRates[tableId] || []).find(r => r.weight_kg === kg)?.sell_price || 0;

  const ensureTable = async (zone) => {
    const existing = pricingTables.find(t => t.carrier_code === carrier && t.zone === zone);
    if (existing) return existing.id;
    // Will be created on first rate save - for now return null
    return null;
  };

  const updateRate = async (tableId, kg, price) => {
    if (!tableId) {
      // Need to create table first
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/customer_pricing_tables`, {
          method:"POST",
          headers: { ...sbHeaders(getToken()), Prefer:"return=representation" },
          body: JSON.stringify({ customer_id:selectedCustomer.id, account_code:selectedCustomer.account_code, carrier_code:carrier, zone: editCell?.split("-")[1], is_active:true }),
        });
        const data = await res.json();
        const newTable = Array.isArray(data) ? data[0] : data;
        if (newTable?.id) tableId = newTable.id;
        else return;
      } catch { return; }
    }
    const rates = pricingRates[tableId] || [];
    const existing = rates.find(r => r.weight_kg === kg);
    const numPrice = parseFloat(price) || 0;
    if (existing) {
      await sb.patch(`customer_pricing_rates?id=eq.${existing.id}`, { sell_price: numPrice });
      setPricingRates(prev => ({ ...prev, [tableId]: prev[tableId].map(r => r.weight_kg === kg ? { ...r, sell_price:numPrice } : r) }));
    } else {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/customer_pricing_rates`, {
          method:"POST", headers: sbHeaders(getToken()),
          body: JSON.stringify({ pricing_table_id:tableId, weight_kg:kg, sell_price:numPrice }),
        });
        const nr = await res.json();
        if (Array.isArray(nr) && nr[0]) setPricingRates(prev => ({ ...prev, [tableId]:[...(prev[tableId]||[]), nr[0]] }));
      } catch {}
    }
  };

  const zoneColors = { BKK:"#FFFBEB", UPC:"#F0FDF4", UPC_CE:"#EFF6FF", UPC_NNS:"#FDF4FF" };

  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ borderCollapse:"collapse", fontSize:12 }}>
        <thead>
          <tr>
            <th style={{ padding:"6px 14px", background:C.bg, border:`1px solid ${C.border}`,
              color:C.inkFaint, fontWeight:700, fontSize:11, letterSpacing:"0.05em" }}>KG</th>
            {zones.map(z => (
              <th key={z} style={{ padding:"6px 20px", background:zoneColors[z]||C.bg,
                border:`1px solid ${C.border}`, color:C.ink, fontWeight:700,
                fontSize:11, letterSpacing:"0.05em", minWidth:90, textAlign:"center" }}>
                {z}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length:maxKg }, (_,i) => i+1).map(kg => (
            <tr key={kg}>
              <td style={{ padding:"3px 14px", border:`1px solid ${C.borderFaint}`,
                background:C.bg, fontWeight:700, color:C.inkMid, textAlign:"center", fontSize:12 }}>
                {kg}
              </td>
              {zones.map(zone => {
                const t = pricingTables.find(t => t.carrier_code === carrier && t.zone === zone);
                const val = t ? getRate(t.id, kg) : 0;
                const ck = `${carrier}-${zone}-${kg}`;
                const isEdit = editCell === ck;
                return (
                  <td key={zone} style={{ padding:"2px 3px", border:`1px solid ${C.borderFaint}`,
                    background: val > 0 ? "#FAFFFC" : C.surface }}>
                    {isEdit ? (
                      <input autoFocus type="number" defaultValue={val}
                        onBlur={async e => {
                          setEditCell(null);
                          const tid = t?.id || await ensureTable(zone);
                          await updateRate(tid, kg, e.target.value);
                        }}
                        onKeyDown={e => e.key === "Enter" && e.target.blur()}
                        style={{ width:78, padding:"4px 6px", fontSize:12,
                          border:`2px solid ${C.green}`, borderRadius:5,
                          textAlign:"right", fontFamily:font, outline:"none",
                          color:C.green, fontWeight:700 }}
                      />
                    ) : (
                      <span onClick={() => setEditCell(ck)}
                        style={{ display:"block", textAlign:"right", padding:"4px 10px",
                          cursor:"pointer", borderRadius:5, minWidth:78,
                          color: val > 0 ? C.green : C.inkFaint, fontWeight: val > 0 ? 700 : 400 }}
                        onMouseEnter={e => e.currentTarget.style.background = C.greenBg}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        {val > 0 ? val : "—"}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop:8, fontSize:11, color:C.inkFaint }}>
        คลิกตัวเลขเพื่อแก้ไข · Enter บันทึก
      </div>
    </div>
  );
}

// ── Customer Detail Panel ─────────────────────────────────
function CustomerDetail({ customer, onSaved }) {
  const [tab, setTab] = useState("info");
  const [form, setForm] = useState({ ...customer });
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const originalData = useRef({ ...customer });
  const [pricingTables, setPricingTables] = useState([]);
  const [pricingRates, setPricingRates] = useState({});
  const [surcharges, setSurcharges] = useState([]);
  const [surchargeOverrides, setSurchargeOverrides] = useState([]);
  const [senders, setSenders] = useState([]);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [xlsxReady, setXlsxReady] = useState(!!window.XLSX);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState(null);
  const [flashType, setFlashType] = useState("STD");

  useEffect(() => { 
    setForm({ ...customer }); 
    originalData.current = { ...customer };
    setTab("info"); 
  }, [customer.id]);

  useEffect(() => {
    if (!window.XLSX) {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
      s.onload = () => setXlsxReady(true);
      document.head.appendChild(s);
    }
  }, []);

  const loadPricing = useCallback(async () => {
    if (tab === "info") return;
    setLoadingPricing(true);
    const [tables, surcs, senderData] = await Promise.all([
      sb.get(`customer_pricing_tables?account_code=eq.${encodeURIComponent(customer.account_code)}&order=carrier_code,zone`),
      sb.get("carrier_surcharges?order=carrier_code,sort_order"),
      sb.get(`customer_sender_mapping?account_code=eq.${encodeURIComponent(customer.account_code)}`),
    ]);
    setPricingTables(Array.isArray(tables) ? tables : []);
    setSurcharges(Array.isArray(surcs) ? surcs : []);
    setSenders(Array.isArray(senderData) ? senderData : []);

    const overrides = await sb.get(`customer_surcharge_overrides?account_code=eq.${encodeURIComponent(customer.account_code)}`);
    setSurchargeOverrides(Array.isArray(overrides) ? overrides : []);

    const ratesMap = {};
    for (const t of (Array.isArray(tables) ? tables : [])) {
      const rates = await sb.get(`customer_pricing_rates?pricing_table_id=eq.${t.id}&order=weight_kg.asc`);
      ratesMap[t.id] = Array.isArray(rates) ? rates : [];
    }
    setPricingRates(ratesMap);
    setLoadingPricing(false);
  }, [tab, customer.account_code]);

  useEffect(() => { loadPricing(); }, [loadPricing]);

  const handleSave = () => setShowConfirm(true);

  const handleCancelSave = () => {
    setShowConfirm(false);
    setForm({ ...originalData.current }); // reset to original using ref
  };

  const doSave = async () => {
    setShowConfirm(false);
    setSaving(true);
    try {
      await sb.patch(`wf_customers?id=eq.${customer.id}`, {
        ...form, cod_percent: parseFloat(form.cod_percent) || 2
      });
      originalData.current = { ...customer, ...form }; // update ref after save
      onSaved({ ...customer, ...form });
    } catch (e) { alert("บันทึกไม่สำเร็จ: " + e.message); }
    setSaving(false);
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file || !window.XLSX) return;
    setImporting(true); setImportMsg(null);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const wb = window.XLSX.read(ev.target.result, { type:"array" });
        let total = 0;
        for (const [sheet, code, zones, maxKg] of [
          ["ราคาขาย Flash","FLASH",["BKK","UPC"],50],
          ["ราคาขาย DHL","DHL",["BKK","UPC_CE","UPC_NNS"],30],
        ]) {
          const ws = wb.Sheets[sheet]; if (!ws) continue;
          const rows = window.XLSX.utils.sheet_to_json(ws, { defval:0 });
          for (const row of rows) {
            const acKey = Object.keys(row).find(k => k.includes("account_code"));
            if (!acKey || row[acKey] !== customer.account_code) continue;
            const zKey = Object.keys(row).find(k => k.includes("zone"));
            const zone = zKey ? String(row[zKey]).trim() : ""; if (!zone || !zones.includes(zone)) continue;
            const tRes = await fetch(`${SUPABASE_URL}/rest/v1/customer_pricing_tables`, {
              method:"POST", headers:{ ...sbHeaders(getToken()), Prefer:"resolution=merge-duplicates,return=representation" },
              body: JSON.stringify({ customer_id:customer.id, account_code:customer.account_code, carrier_code:code, zone, is_active:true }),
            });
            const tData = await tRes.json();
            const tableId = Array.isArray(tData) ? tData[0]?.id : tData?.id; if (!tableId) continue;
            const rates = [];
            for (let kg=1; kg<=maxKg; kg++) {
              const price = parseFloat(row[kg]||row[String(kg)])||0;
              if (price > 0) rates.push({ pricing_table_id:tableId, weight_kg:kg, sell_price:price });
            }
            if (rates.length > 0) {
              await sb.del(`customer_pricing_rates?pricing_table_id=eq.${tableId}`);
              await fetch(`${SUPABASE_URL}/rest/v1/customer_pricing_rates`, {
                method:"POST", headers:sbHeaders(getToken()), body:JSON.stringify(rates),
              });
              total += rates.length;
            }
          }
        }
        setImportMsg({ ok:true, msg:`Import สำเร็จ ${total} rates` });
        loadPricing();
      } catch (err) { setImportMsg({ ok:false, msg:err.message }); }
      setImporting(false); e.target.value = "";
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    if (!window.XLSX) return;
    const wb = window.XLSX.utils.book_new();
    const fHdr = ["account_code**","zone**(BKK/UPC)",...Array.from({length:50},(_,i)=>i+1)];
    const fRows = ["BKK","UPC"].map(zone => {
      const t = pricingTables.find(t => t.carrier_code==="FLASH" && t.zone===zone);
      const rates = t ? (pricingRates[t.id]||[]) : [];
      const row = { "account_code**":customer.account_code, "zone**(BKK/UPC)":zone };
      rates.forEach(r => { row[r.weight_kg] = r.sell_price; }); return row;
    });
    window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet(fRows,{header:fHdr}), "ราคาขาย Flash");
    const dRows = ["BKK","UPC_CE","UPC_NNS"].map(zone => {
      const t = pricingTables.find(t => t.carrier_code==="DHL" && t.zone===zone);
      const rates = t ? (pricingRates[t.id]||[]) : [];
      const row = { "account_code**":customer.account_code, "zone**(BKK/UPC_CE/UPC_NNS)":zone };
      rates.forEach(r => { row[r.weight_kg] = r.sell_price; }); return row;
    });
    window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet(dRows), "ราคาขาย DHL");
    window.XLSX.writeFile(wb, `${customer.account_code}_pricing.xlsx`);
  };

  return (
    <>
    <div style={{ flex:1, overflowY:"auto", padding:"24px 28px" }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div>
          <h2 style={{ fontSize:22, fontWeight:700, color:C.ink, letterSpacing:"-0.5px", margin:0 }}>
            {customer.account_code}
          </h2>
          <div style={{ fontSize:13, color:C.inkMid, marginTop:2 }}>{customer.customer_name}</div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <label style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"8px 16px",
            fontSize:12, borderRadius:8, border:`1.5px solid ${C.border}`, background:C.surface,
            color:C.inkMid, cursor:xlsxReady?"pointer":"default", fontFamily:font, fontWeight:500 }}>
            {importing ? "กำลัง Import..." : "📥 Import (.xlsx)"}
            <input type="file" accept=".xlsx" onChange={handleImport} disabled={!xlsxReady||importing} style={{ display:"none" }}/>
          </label>
          <Btn variant="outline" onClick={downloadTemplate} disabled={!xlsxReady}>📤 Template</Btn>
        </div>
      </div>

      {importMsg && (
        <div style={{ padding:"10px 16px", borderRadius:8, marginBottom:16, fontSize:13,
          background:importMsg.ok ? C.greenBg : C.redBg, color:importMsg.ok ? C.green : C.red }}>
          {importMsg.ok ? `✅ ${importMsg.msg}` : `❌ ${importMsg.msg}`}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:"flex", gap:2, borderBottom:`2px solid ${C.border}`, marginBottom:20 }}>
        {CUSTOMER_TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding:"9px 18px", fontSize:13, border:"none", cursor:"pointer",
              fontFamily:font, borderRadius:"8px 8px 0 0", transition:"all 0.15s",
              background:"transparent",
              color: tab===t.key ? C.green : C.inkMid,
              fontWeight: tab===t.key ? 700 : 400,
              borderBottom: tab===t.key ? `2px solid ${C.green}` : "2px solid transparent",
              marginBottom:"-2px" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Info Tab */}
      {tab === "info" && (
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px 20px", marginBottom:20 }}>
            {FORM_FIELDS.map(f => (
              <FieldGroup key={f.key} label={f.label} span={f.half ? 1 : 2}>
                {f.key === "status" ? (
                  <select value={form.status || "active"} onChange={e => setForm({...form, status:e.target.value})}
                    style={{ width:"100%", padding:"9px 12px", fontSize:13, border:`1.5px solid ${C.border}`,
                      borderRadius:8, background:C.bg, color:C.ink, fontFamily:font, outline:"none", cursor:"pointer" }}>
                    <option value="active">✅ Active</option>
                    <option value="inactive">⏸ Inactive</option>
                    <option value="lost">❌ Lost</option>
                    <option value="stop_trade">🚫 Stop Trade</option>
                  </select>
                ) : f.key === "notes" ? (
                  <textarea value={form[f.key]||""} onChange={e => setForm({...form,[f.key]:e.target.value})}
                    placeholder={f.placeholder}
                    style={{ width:"100%", padding:"9px 12px", fontSize:13, border:`1.5px solid ${C.border}`,
                      borderRadius:8, background:C.bg, color:C.ink, fontFamily:font, outline:"none",
                      resize:"vertical", minHeight:72, boxSizing:"border-box" }}
                  />
                ) : (
                  <Input value={form[f.key]||""} onChange={e => setForm({...form,[f.key]:e.target.value})}
                    placeholder={f.placeholder} />
                )}
              </FieldGroup>
            ))}
          </div>
          <Btn onClick={handleSave} disabled={saving}>
            {saving ? "กำลังบันทึก..." : "💾 บันทึก"}
          </Btn>
        </div>
      )}

      {/* Flash Tab */}
      {tab === "flash" && (
        <div>
          <div style={{ display:"flex", gap:8, marginBottom:16, alignItems:"center" }}>
            <span style={{ fontSize:12, color:C.inkMid, fontWeight:500 }}>ประเภทบริการ:</span>
            {[{key:"STD",label:"มาตรฐาน",c:C.green},{key:"BULKY",label:"Bulky",c:C.amber},{key:"FRUIT",label:"ผลไม้",c:C.purple}].map(s => {
              const active = flashType === s.key;
              return (
                <button key={s.key} onClick={() => setFlashType(s.key)}
                  style={{ padding:"5px 16px", fontSize:12, borderRadius:6, border:`1.5px solid ${active?s.c:C.border}`,
                    background:active?s.c:"transparent", color:active?"#fff":C.inkMid,
                    cursor:"pointer", fontFamily:font, fontWeight:500 }}>
                  {s.label}
                </button>
              );
            })}
          </div>
          {loadingPricing ? <Spinner/> : (
            <PricingGrid carrier="FLASH" zones={["BKK","UPC"]}
              pricingTables={pricingTables} pricingRates={pricingRates}
              setPricingRates={setPricingRates} selectedCustomer={customer} />
          )}
        </div>
      )}

      {/* DHL Tab */}
      {tab === "dhl" && (
        loadingPricing ? <Spinner/> :
        <PricingGrid carrier="DHL" zones={["BKK","UPC_CE","UPC_NNS"]}
          pricingTables={pricingTables} pricingRates={pricingRates}
          setPricingRates={setPricingRates} selectedCustomer={customer} />
      )}

      {/* Surcharge Tab */}
      {tab === "surcharge" && (
        loadingPricing ? <Spinner/> :
        <div>
          <div style={{ fontSize:13, color:C.inkMid, marginBottom:14 }}>
            ราคา surcharge เฉพาะลูกค้านี้ — ถ้าไม่กำหนด ใช้ค่า default ของ carrier
          </div>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ background:C.bg }}>
                {["Carrier","Code","ชื่อ","VAT","ราคาขาย","เก็บ?"].map(h => (
                  <th key={h} style={{ padding:"9px 14px", textAlign:"left",
                    borderBottom:`1.5px solid ${C.border}`, fontSize:11,
                    fontWeight:700, color:C.inkFaint, textTransform:"uppercase", letterSpacing:"0.05em" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {surcharges.map(cs => {
                const ov = surchargeOverrides.find(o => o.carrier_code===cs.carrier_code && o.surcharge_code===cs.surcharge_code);
                return (
                  <tr key={`${cs.carrier_code}-${cs.surcharge_code}`}
                    style={{ borderBottom:`1px solid ${C.borderFaint}` }}>
                    <td style={{ padding:"10px 14px" }}>
                      <span style={{ fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:4,
                        background:cs.carrier_code==="FLASH"?C.amberBg:C.blueBg,
                        color:cs.carrier_code==="FLASH"?C.amber:C.blue }}>
                        {cs.carrier_code}
                      </span>
                    </td>
                    <td style={{ padding:"10px 14px", fontSize:11, color:C.inkFaint, fontFamily:"monospace" }}>{cs.surcharge_code}</td>
                    <td style={{ padding:"10px 14px", color:C.ink }}>{cs.surcharge_name}</td>
                    <td style={{ padding:"10px 14px", textAlign:"center" }}>
                      {cs.has_vat ? <span style={{ fontSize:11, color:C.amber }}>มี VAT</span>
                        : <span style={{ color:C.inkFaint }}>—</span>}
                    </td>
                    <td style={{ padding:"6px 14px" }}>
                      <input type="number" defaultValue={ov?.sell_price ?? cs.default_sell}
                        style={{ width:72, padding:"5px 8px", fontSize:13, border:`1.5px solid ${C.border}`,
                          borderRadius:6, textAlign:"right", fontFamily:font, outline:"none", color:C.green, fontWeight:600 }}
                        onBlur={async e => {
                          await fetch(`${SUPABASE_URL}/rest/v1/customer_surcharge_overrides`, {
                            method:"POST", headers:{ ...sbHeaders(getToken()), Prefer:"resolution=merge-duplicates" },
                            body: JSON.stringify({ customer_id:customer.id, account_code:customer.account_code, carrier_code:cs.carrier_code, surcharge_code:cs.surcharge_code, sell_price:parseFloat(e.target.value)||0, is_enabled:ov?.is_enabled??true }),
                          });
                        }}
                        onKeyDown={e => e.key==="Enter" && e.target.blur()}
                      />
                    </td>
                    <td style={{ padding:"10px 14px", textAlign:"center" }}>
                      <input type="checkbox" defaultChecked={ov?.is_enabled??true} style={{ accentColor:C.green, cursor:"pointer" }}
                        onChange={async e => {
                          await fetch(`${SUPABASE_URL}/rest/v1/customer_surcharge_overrides`, {
                            method:"POST", headers:{ ...sbHeaders(getToken()), Prefer:"resolution=merge-duplicates" },
                            body: JSON.stringify({ customer_id:customer.id, account_code:customer.account_code, carrier_code:cs.carrier_code, surcharge_code:cs.surcharge_code, sell_price:ov?.sell_price??cs.default_sell, is_enabled:e.target.checked }),
                          });
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Sender Tab */}
      {tab === "sender" && (
        loadingPricing ? <Spinner/> :
        <div>
          <div style={{ fontSize:13, color:C.inkMid, marginBottom:16 }}>
            ชื่อ Sender ในไฟล์ KA ที่ map มาเป็น account นี้
          </div>
          {senders.map(m => (
            <div key={m.id} style={{ display:"flex", gap:10, marginBottom:10, alignItems:"center" }}>
              <Input defaultValue={m.sender_name}
                onBlur={async e => sb.patch(`customer_sender_mapping?id=eq.${m.id}`, { sender_name:e.target.value })}
                style={{ flex:1 }} />
              <span style={{ fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:6,
                background:C.amberBg, color:C.amber, whiteSpace:"nowrap" }}>
                {m.carrier_code}
              </span>
              <Btn variant="danger-ghost" size="sm" onClick={async () => {
                await sb.del(`customer_sender_mapping?id=eq.${m.id}`);
                setSenders(prev => prev.filter(x => x.id !== m.id));
              }}>ลบ</Btn>
            </div>
          ))}
          <button onClick={async () => {
            try {
              const res = await fetch(`${SUPABASE_URL}/rest/v1/customer_sender_mapping`, {
                method:"POST", headers:{ ...sbHeaders(getToken()), Prefer:"return=representation" },
                body: JSON.stringify({ customer_id:customer.id, account_code:customer.account_code, sender_name:"", carrier_code:"FLASH", is_active:true }),
              });
              const data = await res.json();
              if (Array.isArray(data) && data[0]) setSenders(prev => [...prev, data[0]]);
            } catch {}
          }} style={{ marginTop:8, padding:"8px 18px", fontSize:13, borderRadius:8,
            border:`1.5px dashed ${C.border}`, background:"transparent", color:C.inkMid,
            cursor:"pointer", fontFamily:font }}>
            + เพิ่ม Sender
          </button>
        </div>
      )}
    </div>
    <Modal open={showConfirm} onClose={handleCancelSave} title="" width={380}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:32, marginBottom:8 }}>💾</div>
        <h3 style={{ fontSize:17, fontWeight:700, margin:"0 0 8px", color:C.ink }}>ยืนยันการบันทึก</h3>
        <p style={{ color:C.inkMid, fontSize:14, margin:"0 0 20px" }}>
          ต้องการบันทึกการเปลี่ยนแปลงข้อมูลของ<br/>
          <strong style={{ color:C.ink }}>{customer.account_code}</strong> ใช่ไหม?
        </p>
        <div style={{ display:"flex", gap:10 }}>
          <Btn variant="ghost" onClick={handleCancelSave} style={{ flex:1 }}>ยกเลิก</Btn>
          <Btn onClick={doSave} style={{ flex:1 }}>✅ ยืนยัน บันทึก</Btn>
        </div>
      </div>
    </Modal>
    </>
  );
}

// ── Customer List (Left Panel) ────────────────────────────
function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [checked, setChecked] = useState(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [xlsxReady, setXlsxReady] = useState(!!window.XLSX);
  const [importingCustomers, setImportingCustomers] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!window.XLSX) {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
      s.onload = () => setXlsxReady(true);
      document.head.appendChild(s);
    }
  }, []);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    let url = `wf_customers?select=*&order=account_code.asc`;
    if (filter) url += `&status=eq.${filter}`;
    if (search) url += `&or=(account_code.ilike.*${search}*,customer_name.ilike.*${search}*,phone.ilike.*${search}*)`;
    const data = await sb.get(url);
    setCustomers(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [filter, search]);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  const counts = customers.reduce((acc, c) => {
    acc.all = (acc.all||0)+1; acc[c.status] = (acc[c.status]||0)+1; return acc;
  }, {});

  const handleSaved = (updated) => {
    setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c));
    setSelected(updated);
  };

  const handleAdd = async (form) => {
    if (!form.account_code || !form.customer_name) { alert("กรุณากรอก Account Code และชื่อลูกค้า"); return; }
    try {
      const res = await sb.upsert("wf_customers", { ...form, cod_percent:parseFloat(form.cod_percent)||2 });
      if (res.ok || res.status === 204) {
        setShowAdd(false); loadCustomers();
      } else {
        const e = await res.json(); throw new Error(e.message || "Error");
      }
    } catch (e) { alert("Error: " + e.message); }
  };

  const bulkDelete = async () => {
    setDeleting(true);
    for (const id of checked) { await sb.del(`wf_customers?id=eq.${id}`); }
    if (selected && checked.has(selected.id)) setSelected(null);
    setChecked(new Set()); setShowDeleteModal(false); setDeleting(false); loadCustomers();
  };

  const toggleCheck = (id, e) => {
    e.stopPropagation();
    setChecked(prev => { const s=new Set(prev); s.has(id)?s.delete(id):s.add(id); return s; });
  };

  const exportCustomers = async () => {
    if (!window.XLSX) return;
    setExporting(true);
    try {
      // Fetch ALL customers (no filter, no search limit)
      const data = await sb.get("wf_customers?select=*&order=account_code.asc");
      const rows = (Array.isArray(data) ? data : []).map(c => ({
        "account_code":        c.account_code || "",
        "customer_name":       c.customer_name || "",
        "status":              c.status || "",
        "account_parent":      c.account_parent || "",
        "phone":               c.phone || "",
        "email":               c.email || "",
        "business_type":       c.business_type || "",
        "sales_owner":         c.sales_owner || "",
        "billing_cycle":       c.billing_cycle || "",
        "cod_percent":         c.cod_percent || 2,
        "tax_id":              c.tax_id || "",
        "invoice_name":        c.invoice_name || "",
        "bank_name":           c.bank_name || "",
        "bank_account":        c.bank_account || "",
        "bank_account_name":   c.bank_account_name || "",
        "line_group_id":       c.line_group_id || "",
        "notes":               c.notes || "",
      }));
      const ws = window.XLSX.utils.json_to_sheet(rows);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, "ลูกค้า");
      const today = new Date().toISOString().split("T")[0];
      window.XLSX.writeFile(wb, `customers_export_${today}.xlsx`);
    } catch (e) { alert("Export ไม่สำเร็จ: " + e.message); }
    setExporting(false);
  };

  const downloadCustomerTemplate = () => {
    if (!window.XLSX) return;
    const headers = ["account_code**","customer_name**","account_parent","status","phone","email",
      "business_type","sales_owner","billing_cycle","cod_percent","tax_id","invoice_name",
      "bank_name","bank_account","bank_account_name","line_group_id","notes"];
    const example = [{
      "account_code**":"CZ0108-49","customer_name**":"ตัวอย่าง บจ. จำกัด",
      "account_parent":"CZ0108","status":"active","phone":"0812345678",
      "email":"example@mail.com","business_type":"ร้านค้าออนไลน์",
      "sales_owner":"เฟิส","billing_cycle":"เงินสดวางบิลวันถัดไป","cod_percent":2,
      "tax_id":"0105565045320","invoice_name":"บริษัท ตัวอย่าง จำกัด",
      "bank_name":"กสิกร","bank_account":"xxx-x-xxxxx-x","bank_account_name":"ชื่อ-นามสกุล",
      "line_group_id":"Cxxxxxxxx","notes":"",
    }];
    const ws = window.XLSX.utils.json_to_sheet(example, { header:headers });
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "ลูกค้า");
    window.XLSX.writeFile(wb, "template_customers.xlsx");
  };

  const importCustomers = async (e) => {
    const file = e.target.files[0]; if (!file||!window.XLSX) return;
    setImportingCustomers(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const wb = window.XLSX.read(ev.target.result,{type:"array"});
        const ws = wb.Sheets["ลูกค้า"]||wb.Sheets[wb.SheetNames[0]];
        const rows = window.XLSX.utils.sheet_to_json(ws,{defval:""});
        let ok=0, skip=0;
        for (const row of rows) {
          const ac = String(row["account_code**"]||row["account_code"]||"").trim();
          const nm = String(row["customer_name**"]||row["customer_name"]||"").trim();
          if (!ac||!nm){skip++;continue;}
          const payload = { account_code:ac, customer_name:nm,
            account_parent:String(row.account_parent||"CZ0108").trim(),
            status:String(row.status||"active").trim(), phone:String(row.phone||"").trim(),
            email:String(row.email||"").trim(), business_type:String(row.business_type||"").trim(),
            sales_owner:String(row.sales_owner||"").trim(), billing_cycle:String(row.billing_cycle||"").trim(),
            cod_percent:parseFloat(row.cod_percent||2)||2, tax_id:String(row.tax_id||"").trim(),
            invoice_name:String(row.invoice_name||"").trim(), bank_name:String(row.bank_name||"").trim(),
            bank_account:String(row.bank_account||"").trim(), bank_account_name:String(row.bank_account_name||"").trim(),
            line_group_id:String(row.line_group_id||"").trim(), notes:String(row.notes||"").trim(),
          };
          const res = await sb.upsert("wf_customers", payload);
          if (res.ok||res.status===204||res.status===201||res.status===200) ok++; else skip++;
        }
        alert(`✅ Import ${ok} ลูกค้า${skip>0?" | ข้าม "+skip+" rows":""}`);
        loadCustomers();
      } catch(err){alert("Error: "+err.message);}
      setImportingCustomers(false); e.target.value="";
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden", fontFamily:font }}>
      {/* LEFT */}
      <div style={{ width:300, background:C.surface, borderRight:`1px solid ${C.border}`,
        display:"flex", flexDirection:"column", flexShrink:0 }}>
        {/* Header */}
        <div style={{ padding:"20px 16px 14px", borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:16, fontWeight:700, color:C.ink }}>รายชื่อลูกค้า</div>
            <button onClick={exportCustomers} disabled={!xlsxReady || exporting}
              title="Export ลูกค้าทั้งหมดเป็น Excel"
              style={{ padding:"5px 12px", fontSize:11, borderRadius:6,
                border:`1px solid ${C.green}`, background:C.greenBg,
                color:C.green, cursor:xlsxReady?"pointer":"default",
                fontFamily:font, fontWeight:600, opacity:exporting?0.6:1,
                marginLeft:"auto" }}>
              {exporting ? "กำลัง Export..." : "⬇ Excel"}
            </button>
          </div>

          </div>
          {/* Filter pills */}
          <div style={{ display:"flex", gap:4, marginBottom:12, flexWrap:"wrap" }}>
            {FILTER_TABS.map(f => {
              const cnt = f.val===""?(customers.length):(counts[f.val]||0);
              const isActive = filter===f.val;
              const meta = f.val?STATUS[f.val]:null;
              return (
                <button key={f.val} onClick={()=>{setFilter(f.val);setChecked(new Set());}}
                  style={{ padding:"3px 10px", fontSize:11, borderRadius:99, border:"none",
                    cursor:"pointer", fontFamily:font, fontWeight:isActive?700:500,
                    background:isActive?(meta?.bg||C.greenBg):C.bg,
                    color:isActive?(meta?.text||C.green):C.inkMid,
                    outline:isActive?`1.5px solid ${meta?.dot||C.green}`:"1.5px solid transparent",
                    transition:"all 0.15s" }}>
                  {f.label} <span style={{opacity:0.6}}>{cnt}</span>
                </button>
              );
            })}
          </div>
          {/* Search */}
          <div style={{ position:"relative" }}>
            <input value={searchInput}
              onChange={e => {
                const v = e.target.value;
                setSearchInput(v);
                if (v === "") setSearch(""); // auto reset when cleared
              }}
              onKeyDown={e => e.key==="Enter" && setSearch(searchInput)}
              placeholder="ค้นหา account / ชื่อ..."
              style={{ width:"100%", padding:"8px 12px 8px 32px", fontSize:13,
                border:`1.5px solid ${C.border}`, borderRadius:8, background:C.bg,
                fontFamily:font, outline:"none", boxSizing:"border-box", color:C.ink }}
            />
            <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)",
              color:C.inkFaint, fontSize:13, pointerEvents:"none" }}>⌕</span>
            {searchInput && (
              <span onClick={() => { setSearchInput(""); setSearch(""); }}
                style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)",
                  color:C.inkFaint, fontSize:14, cursor:"pointer", lineHeight:1,
                  padding:"2px 4px", borderRadius:4 }}
                onMouseEnter={e => e.currentTarget.style.color = C.ink}
                onMouseLeave={e => e.currentTarget.style.color = C.inkFaint}>
                ✕
              </span>
            )}
          </div>
        </div>

        {/* Bulk bar */}
        {checked.size > 0 && (
          <div style={{ padding:"8px 14px", background:"#FFFBEB", borderBottom:`1px solid ${C.border}`,
            display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:12, color:C.amber, fontWeight:600 }}>เลือก {checked.size} รายการ</span>
            <Btn variant="danger" size="sm" onClick={()=>setShowDeleteModal(true)}>🗑 ลบที่เลือก</Btn>
          </div>
        )}

        {/* Add button */}
        <div onClick={()=>{setSelected(null);setShowAdd(true);}}
          style={{ padding:"11px 16px", borderBottom:`1px solid ${C.borderFaint}`,
            display:"flex", alignItems:"center", gap:8, cursor:"pointer",
            color:C.green, fontSize:13, fontWeight:600, transition:"background 0.1s" }}
          onMouseEnter={e=>e.currentTarget.style.background=C.greenBg}
          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <span style={{fontSize:18,lineHeight:1}}>+</span> เพิ่มลูกค้าใหม่
        </div>

        {/* List */}
        <div style={{ flex:1, overflowY:"auto" }}>
          {loading ? <Spinner/> : customers.length===0 ? (
            <div style={{ padding:24, textAlign:"center", color:C.inkFaint, fontSize:13 }}>ไม่พบลูกค้า</div>
          ) : customers.map(c => {
            const isSel = selected?.id===c.id;
            const isChk = checked.has(c.id);
            return (
              <div key={c.id} onClick={()=>{setSelected(c);setShowAdd(false);}}
                style={{ padding:"10px 14px", borderBottom:`1px solid ${C.borderFaint}`,
                  background:isSel?C.greenBg:isChk?"#FFFBEB":"transparent",
                  cursor:"pointer", transition:"background 0.1s",
                  borderLeft:isSel?`3px solid ${C.green}`:"3px solid transparent" }}
                onMouseEnter={e=>{if(!isSel)e.currentTarget.style.background=C.bg;}}
                onMouseLeave={e=>{if(!isSel)e.currentTarget.style.background=isChk?"#FFFBEB":"transparent";}}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
                  <input type="checkbox" checked={isChk} onChange={e=>toggleCheck(c.id,e)}
                    onClick={e=>e.stopPropagation()}
                    style={{ marginTop:3, cursor:"pointer", flexShrink:0, accentColor:C.green }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2, flexWrap:"wrap" }}>
                      <span style={{ fontSize:13, fontWeight:600, color:isSel?C.green:C.ink }}>
                        {c.account_code}
                      </span>
                      {c.status!=="active" && <StatusChip status={c.status}/>}
                    </div>
                    <div style={{ fontSize:11, color:C.inkMid, overflow:"hidden",
                      textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {c.customer_name}
                    </div>
                    {c.phone && <div style={{ fontSize:10, color:C.inkFaint, marginTop:1 }}>{c.phone}</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT */}
      {!selected && !showAdd && (
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
          flexDirection:"column", color:C.inkFaint, gap:12 }}>
          <div style={{ fontSize:48, opacity:0.2 }}>◎</div>
          <div style={{ fontSize:14 }}>เลือกลูกค้า หรือกด + เพิ่มลูกค้าใหม่</div>
        </div>
      )}
      {showAdd && !selected && <AddCustomerPanel 
        onSave={handleAdd} 
        onCancel={()=>setShowAdd(false)} 
        xlsxReady={xlsxReady}
        onImportCustomers={importCustomers}
        onDownloadTemplate={downloadCustomerTemplate}
      />}
      {selected && <CustomerDetail key={selected.id} customer={selected} onSaved={handleSaved} />}

      {/* Delete modal */}
      <Modal open={showDeleteModal} onClose={()=>setShowDeleteModal(false)} title="">
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:36, marginBottom:8 }}>🗑</div>
          <h3 style={{ fontSize:17, fontWeight:700, margin:"0 0 8px" }}>ยืนยันการลบ</h3>
          <p style={{ color:C.inkMid, fontSize:14, margin:"0 0 8px" }}>
            ต้องการลบ <strong style={{color:C.red}}>{checked.size} ลูกค้า</strong> ที่เลือกใช่ไหม?
          </p>
          <div style={{ background:C.redBg, color:C.red, fontSize:12, padding:"8px 12px",
            borderRadius:8, marginBottom:20, textAlign:"center" }}>
            ⚠️ ข้อมูลราคาขาย, Surcharge และ Sender Mapping จะถูกลบด้วย
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <Btn variant="ghost" onClick={()=>setShowDeleteModal(false)} disabled={deleting} style={{flex:1}}>ยกเลิก</Btn>
            <Btn variant="danger" onClick={bulkDelete} disabled={deleting} style={{flex:1}}>
              {deleting?"⏳ กำลังลบ...":`🗑 ลบ ${checked.size} รายการ`}
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Add Customer Panel ────────────────────────────────────
function AddCustomerPanel({ onSave, onCancel, xlsxReady, onImportCustomers, onDownloadTemplate }) {
  const [form, setForm] = useState({ ...FORM_DEFAULTS });

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"24px 28px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:8 }}>
        <h2 style={{ fontSize:20, fontWeight:700, color:C.ink, margin:0 }}>เพิ่มลูกค้าใหม่</h2>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <label style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"8px 16px",
            fontSize:12, borderRadius:8, border:`1.5px solid ${C.blue}`, background:C.surface,
            color:C.blue, cursor:xlsxReady?"pointer":"default", fontFamily:font, fontWeight:600 }}>
            📤 Import ลูกค้า (.xlsx)
            <input type="file" accept=".xlsx" onChange={onImportCustomers}
              disabled={!xlsxReady} style={{ display:"none" }}/>
          </label>
          <Btn variant="outline" onClick={onDownloadTemplate} disabled={!xlsxReady}>
            📥 Download Template
          </Btn>
          <Btn variant="ghost" onClick={onCancel}>ยกเลิก</Btn>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px 20px", marginBottom:20 }}>
        {FORM_FIELDS.map(f => (
          <FieldGroup key={f.key} label={f.label} span={f.half?1:2}>
            {f.key==="status" ? (
              <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}
                style={{ width:"100%", padding:"9px 12px", fontSize:13, border:`1.5px solid ${C.border}`,
                  borderRadius:8, background:C.bg, color:C.ink, fontFamily:font, outline:"none", cursor:"pointer" }}>
                <option value="active">✅ Active</option>
                <option value="inactive">⏸ Inactive</option>
                <option value="lost">❌ Lost</option>
                <option value="stop_trade">🚫 Stop Trade</option>
              </select>
            ) : f.key==="notes" ? (
              <textarea value={form[f.key]||""} onChange={e=>setForm({...form,[f.key]:e.target.value})}
                placeholder={f.placeholder}
                style={{ width:"100%", padding:"9px 12px", fontSize:13, border:`1.5px solid ${C.border}`,
                  borderRadius:8, background:C.bg, color:C.ink, fontFamily:font, outline:"none",
                  resize:"vertical", minHeight:72, boxSizing:"border-box" }}
              />
            ) : (
              <Input value={form[f.key]||""} onChange={e=>setForm({...form,[f.key]:e.target.value})} placeholder={f.placeholder}/>
            )}
          </FieldGroup>
        ))}
      </div>
      <Btn onClick={()=>onSave(form)}>💾 บันทึก</Btn>
    </div>
  );
}

// ============================================================
// PLACEHOLDER PAGES
// ============================================================
function PlaceholderPage({ title, icon }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
      height:"100vh", flexDirection:"column", color:C.inkFaint, gap:12, fontFamily:font }}>
      <div style={{ fontSize:48, opacity:0.2 }}>{icon}</div>
      <div style={{ fontSize:18, fontWeight:600, color:C.inkMid }}>{title}</div>
      <div style={{ fontSize:13 }}>กำลังพัฒนา — จะเพิ่มในรอบถัดไป</div>
    </div>
  );
}

// ============================================================
// COST PRICING — ราคาทุนขนส่ง
// ============================================================

function EditCell({ value, onSave, color }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  useEffect(() => { setVal(value); }, [value]);
  if (editing) return (
    <input autoFocus type="number" value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={() => { setEditing(false); const n=parseFloat(val)||0; if(n!==value) onSave(n); }}
      onKeyDown={e => e.key==="Enter" && e.target.blur()}
      style={{ width:64, padding:"3px 5px", fontSize:12, border:`2px solid ${color||C.green}`,
        borderRadius:5, textAlign:"right", fontFamily:font, outline:"none",
        color:color||C.green, fontWeight:700 }}
    />
  );
  return (
    <span onClick={() => setEditing(true)}
      style={{ display:"block", textAlign:"right", padding:"3px 10px", cursor:"pointer",
        borderRadius:5, color:val>0?(color||C.green):C.inkFaint,
        fontWeight:val>0?700:400, minWidth:64 }}
      onMouseEnter={e=>e.currentTarget.style.background=C.greenBg}
      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
      {val > 0 ? val : "—"}
    </span>
  );
}

// ── Flash Cost ────────────────────────────────────────────
function FlashCostPage() {
  const [svc, setSvc] = useState("STD");
  const [tables, setTables] = useState([]);
  const [rates, setRates] = useState({});
  const [loading, setLoading] = useState(true);
  const [xlsxReady, setXlsxReady] = useState(!!window.XLSX);

  const SVCS = [
    {key:"STD",   label:"มาตรฐาน",     color:C.green,  maxKg:50},
    {key:"STD100",label:"100cm",        color:C.teal||"#0891B2", maxKg:50},
    {key:"BULKY", label:"Bulky",        color:C.amber,  maxKg:100},
    {key:"FRUIT", label:"ผลไม้",        color:C.purple, maxKg:50},
  ];
  const ZONES = ["BKK","UPC"];
  const ZONE_COLORS = {BKK:"#FFFBEB", UPC:"#F0FDF4"};
  const SPECIAL = [
    {key:"remote",  label:"Remote Area",  desc:"357 ตำบล", surcharge:50, color:C.red},
    {key:"tourist", label:"Tourist Area", desc:"59 ตำบล",  surcharge:30, color:C.purple},
    {key:"island",  label:"Island",       desc:"32 ตำบล",  surcharge:60, color:C.teal||"#0891B2"},
  ];

  const curSvc = SVCS.find(s=>s.key===svc);

  useEffect(() => {
    if (!window.XLSX) {
      const s=document.createElement("script");
      s.src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
      s.onload=()=>setXlsxReady(true); document.head.appendChild(s);
    }
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await sb.get("price_tables?carrier_code=eq.FLASH&order=service_type,zone");
    setTables(Array.isArray(data)?data:[]);
    const rMap={};
    for(const t of (Array.isArray(data)?data:[])){
      const r=await sb.get(`price_table_rates?price_table_id=eq.${t.id}&order=weight_kg.asc`);
      rMap[t.id]=Array.isArray(r)?r:[];
    }
    setRates(rMap); setLoading(false);
  };

  const getTable = (s,z) => tables.find(t=>(t.service_type||"STD")===s&&t.zone===z);
  const getRate = (tid,kg) => (rates[tid]||[]).find(r=>r.weight_kg===kg)?.cost_price||0;

  const ensureTable = async (s,z) => {
    const ex=getTable(s,z); if(ex) return ex.id;
    const res=await fetch(`${SUPABASE_URL}/rest/v1/price_tables`,{
      method:"POST",headers:{...sbHeaders(getToken()),Prefer:"return=representation"},
      body:JSON.stringify({carrier_code:"FLASH",service_type:s,zone:z,
        table_name:`Flash ${s} ${z}`,is_active:true}),
    });
    const d=await res.json(); const t=Array.isArray(d)?d[0]:d;
    if(t?.id){setTables(p=>[...p,t]);setRates(p=>({...p,[t.id]:[]}));return t.id;}
    return null;
  };

  const updateRate = async (tid,kg,price) => {
    const ex=(rates[tid]||[]).find(r=>r.weight_kg===kg);
    if(ex){
      await sb.patch(`price_table_rates?id=eq.${ex.id}`,{cost_price:price});
      setRates(p=>({...p,[tid]:p[tid].map(r=>r.weight_kg===kg?{...r,cost_price:price}:r)}));
    } else {
      const res=await fetch(`${SUPABASE_URL}/rest/v1/price_table_rates`,{
        method:"POST",headers:{...sbHeaders(getToken()),Prefer:"return=representation"},
        body:JSON.stringify({price_table_id:tid,weight_kg:kg,cost_price:price}),
      });
      const nr=await res.json();
      if(Array.isArray(nr)&&nr[0]) setRates(p=>({...p,[tid]:[...(p[tid]||[]),nr[0]]}));
    }
  };

  const handleImport = async (e) => {
    const file=e.target.files[0]; if(!file||!window.XLSX) return;
    const reader=new FileReader();
    reader.onload=async(ev)=>{
      try {
        const wb=window.XLSX.read(ev.target.result,{type:"array"});
        const sheetNames=wb.SheetNames;
        let count=0;

        // ── ตรวจ format: ไฟล์ต้นฉบับ (มี sheet ทุน Flash WF) หรือ template ของเรา
        const isOriginal = sheetNames.some(s=>s.includes("Flash WF")||s.includes("ทุน Flash")||s.includes("BulkyWF")||s.includes("FruitWF"));

        if(isOriginal) {
          // ── Flash STD: "ทุน Flash WF eff 1.3.25" หรือ "ทุน Flash WF"
          const stdSheet = sheetNames.find(s=>s.includes("Flash WF"));
          if(stdSheet) {
            const ws=wb.Sheets[stdSheet];
            const rows=window.XLSX.utils.sheet_to_json(ws,{header:1,defval:""});
            // หา header row (row ที่มี [BKK])
            let hdr=-1;
            for(let i=0;i<rows.length;i++) if(String(rows[i][0]).includes("Weight")||String(rows[i][0]).includes("≤ 1")){hdr=i;break;}
            const dataStart=rows.findIndex(r=>String(r[0]).includes("≤")||/^≤?\s*\d+$/.test(String(r[0]).trim()));
            for(let i=dataStart>0?dataStart:3;i<rows.length;i++){
              const r=rows[i]; const wt=String(r[0]).replace("≤","").trim();
              const kg=parseInt(wt); if(!kg||isNaN(kg)) continue;
              // col2=BKK→BKK, col3=BKK→UPC, col4=UPC→BKK, col5=Within, col6=C→UPC
              const bkk=Math.max(parseFloat(r[2])||0, parseFloat(r[4])||0);
              const upc=Math.max(parseFloat(r[3])||0, parseFloat(r[5])||0, parseFloat(r[6])||0);
              if(bkk>0){const tid=await ensureTable("STD","BKK");if(tid)await updateRate(tid,kg,bkk);count++;}
              if(upc>0){const tid=await ensureTable("STD","UPC");if(tid)await updateRate(tid,kg,upc);count++;}
            }
          }
          // ── Flash BULKY: "ทุน BulkyWF"
          const bulkySheet = sheetNames.find(s=>s.toLowerCase().includes("bulky"));
          if(bulkySheet) {
            const ws=wb.Sheets[bulkySheet];
            const rows=window.XLSX.utils.sheet_to_json(ws,{header:1,defval:""});
            for(let i=2;i<rows.length;i++){
              const r=rows[i]; const wt=String(r[0]).replace("≤","").trim();
              const kg=parseInt(wt); if(!kg||isNaN(kg)) continue;
              const bkk=parseFloat(r[2])||0; const upc=parseFloat(r[3])||0;
              if(bkk>0){const tid=await ensureTable("BULKY","BKK");if(tid)await updateRate(tid,kg,bkk);count++;}
              if(upc>0){const tid=await ensureTable("BULKY","UPC");if(tid)await updateRate(tid,kg,upc);count++;}
            }
          }
          // ── Flash FRUIT: "ทุน FruitWF"
          const fruitSheet = sheetNames.find(s=>s.toLowerCase().includes("fruit"));
          if(fruitSheet) {
            const ws=wb.Sheets[fruitSheet];
            const rows=window.XLSX.utils.sheet_to_json(ws,{header:1,defval:""});
            for(let i=1;i<rows.length;i++){
              const r=rows[i]; const kg=parseInt(String(r[0]).trim()); if(!kg||isNaN(kg)) continue;
              const bkk=parseFloat(r[2])||0; const upc=parseFloat(r[4])||0;
              if(bkk>0){const tid=await ensureTable("FRUIT","BKK");if(tid)await updateRate(tid,kg,bkk);count++;}
              if(upc>0){const tid=await ensureTable("FRUIT","UPC");if(tid)await updateRate(tid,kg,upc);count++;}
            }
          }
        } else {
          // ── Template format: คอลัมน์ kg, STD_BKK, STD_UPC, BULKY_BKK, ...
          const ws=wb.Sheets[sheetNames[0]];
          const rows=window.XLSX.utils.sheet_to_json(ws,{defval:0});
          for(const row of rows){
            const kg=parseInt(row["kg"]||row["KG"]||row["น้ำหนัก"])||0; if(!kg) continue;
            for(const s of ["STD","STD100","BULKY","FRUIT"]) for(const z of ["BKK","UPC"]){
              const price=parseFloat(row[`${s}_${z}`])||0;
              if(price>0){const tid=await ensureTable(s,z);if(tid){await updateRate(tid,kg,price);count++;}}
            }
          }
        }
        alert(`✅ Import Flash สำเร็จ ${count} rates`); loadData();
      } catch(err){alert("Error: "+err.message);}
      e.target.value="";
    };
    reader.readAsArrayBuffer(file);
  };

  const handleTemplate = () => {
    if(!window.XLSX) return;
    const cols=["kg"];
    ["STD","STD100","BULKY","FRUIT"].forEach(s=>["BKK","UPC"].forEach(z=>cols.push(`${s}_${z}`)));
    const maxKg=100;
    const rows=Array.from({length:maxKg},(_,i)=>{
      const row={kg:i+1};
      ["STD","STD100","BULKY","FRUIT"].forEach(s=>["BKK","UPC"].forEach(z=>{
        const t=getTable(s,z); row[`${s}_${z}`]=t?(getRate(t.id,i+1)||""):"";
      })); return row;
    });
    const ws=window.XLSX.utils.json_to_sheet(rows,{header:cols});
    const wb=window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb,ws,"Flash Cost");
    window.XLSX.writeFile(wb,"flash_cost_template.xlsx");
  };

  return (
    <div style={{padding:"24px 32px",fontFamily:font}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
        <div>
          <h3 style={{fontSize:18,fontWeight:700,color:C.ink,margin:"0 0 4px",letterSpacing:"-0.3px"}}>
            Flash Express — ราคาทุน
          </h3>
          <div style={{fontSize:12,color:C.inkMid}}>คลิกตัวเลขเพื่อแก้ไขได้เลย</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <label style={{padding:"7px 16px",fontSize:12,borderRadius:8,
            border:`1.5px solid ${C.blue}`,color:C.blue,cursor:xlsxReady?"pointer":"default",
            fontFamily:font,fontWeight:600,background:C.surface}}>
            📥 Import (.xlsx)
            <input type="file" accept=".xlsx" onChange={handleImport} disabled={!xlsxReady} style={{display:"none"}}/>
          </label>
          <Btn variant="ghost" onClick={handleTemplate} disabled={!xlsxReady}>📤 Template</Btn>
        </div>
      </div>

      <div style={{display:"flex",gap:6,marginBottom:16}}>
        {SVCS.map(s=>(
          <button key={s.key} onClick={()=>setSvc(s.key)}
            style={{padding:"7px 20px",fontSize:13,borderRadius:8,border:"none",
              cursor:"pointer",fontFamily:font,fontWeight:600,
              background:svc===s.key?s.color:C.bg,
              color:svc===s.key?"#fff":C.inkMid,
              outline:svc===s.key?"none":`1.5px solid ${C.border}`}}>
            {s.label}
            {s.key==="BULKY"&&<span style={{fontSize:10,marginLeft:5,opacity:0.8}}>1–100 kg</span>}
            {s.key==="STD100"&&<span style={{fontSize:10,marginLeft:5,opacity:0.8}}>≤100cm</span>}
          </button>
        ))}
      </div>

      <Card style={{padding:0,overflow:"hidden",marginBottom:12}}>
        <div style={{overflowX:"auto",maxHeight:460,overflowY:"auto"}}>
          <table style={{borderCollapse:"collapse",fontSize:12,width:"100%"}}>
            <thead style={{position:"sticky",top:0,zIndex:1}}>
              <tr>
                <th style={{padding:"8px 16px",background:C.bg,border:`1px solid ${C.border}`,
                  color:C.inkFaint,fontWeight:700,fontSize:11,textAlign:"center",minWidth:56}}>KG</th>
                <th style={{padding:"8px 12px",background:C.bg,border:`1px solid ${C.border}`,
                  color:C.inkFaint,fontWeight:700,fontSize:11,textAlign:"center",minWidth:80}}>ขนาด (cm)</th>
                {ZONES.map(z=>(
                  <th key={z} style={{padding:"8px 32px",background:ZONE_COLORS[z],
                    border:`1px solid ${C.border}`,color:C.ink,fontWeight:700,
                    fontSize:11,textAlign:"center",minWidth:110}}>{z}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({length:curSvc.maxKg},(_,i)=>i+1).map(kg=>{
                const size = svc==="STD"
                  ? (kg<=5?"≤80":kg===6?"≤85":kg===7?"≤90":kg===8?"≤95":`≤${95+(kg-8)*5}`)
                  : svc==="STD100"
                  ? (kg<=9?"≤100":kg===10?"≤105":kg===11?"≤110":kg===12?"≤115":kg<=50?`≤${100+(kg-9)*5}`:"≤100")
                  : svc==="BULKY"
                  ? (kg<=6?"60":`${60+(kg-6)*10}`)
                  : svc==="FRUIT"
                  ? (kg===1?"40":kg===2?"50":kg===3?"60":kg===4?"70":kg===5?"80":kg===6?"85":kg===7?"90":kg===8?"95":kg===9?"100":`≤${100+(kg-9)*5}`)
                  : "—";
                return (
                <tr key={kg} style={{background:kg%2===0?C.bg+"80":"white"}}>
                  <td style={{padding:"2px 16px",border:`1px solid ${C.borderFaint}`,
                    textAlign:"center",fontWeight:700,color:C.inkMid}}>{kg}</td>
                  <td style={{padding:"2px 12px",border:`1px solid ${C.borderFaint}`,
                    textAlign:"center",fontSize:11,color:C.inkFaint}}>{size}</td>
                  {ZONES.map(z=>{
                    const t=getTable(svc,z); const val=t?getRate(t.id,kg):0;
                    return(
                      <td key={z} style={{padding:"1px 2px",border:`1px solid ${C.borderFaint}`,
                        background:val>0?"#FAFFFC":"transparent"}}>
                        {loading?<span style={{display:"block",padding:"3px 10px",color:C.inkFaint,fontSize:11}}>...</span>:
                        <EditCell value={val} color={curSvc.color}
                          onSave={async price=>{const tid=t?.id||await ensureTable(svc,z);if(tid)await updateRate(tid,kg,price);}}
                        />}
                      </td>
                    );
                  })}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div style={{fontSize:13,fontWeight:700,color:C.ink,marginBottom:14}}>
          ค่าพื้นที่พิเศษ Flash
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
          {SPECIAL.map(a=>(
            <div key={a.key} style={{border:`1.5px solid ${a.color}25`,borderRadius:10,
              padding:"14px 16px",background:`${a.color}08`}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <span style={{fontSize:12,fontWeight:700,color:a.color}}>{a.label}</span>
                <span style={{fontSize:10,color:C.inkFaint,background:C.bg,
                  padding:"2px 7px",borderRadius:99}}>{a.desc}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:11,color:C.inkMid}}>บวกเพิ่ม/ชิ้น</span>
                <div style={{display:"flex",alignItems:"center",gap:4}}>
                  <input type="number" defaultValue={a.surcharge}
                    style={{width:60,padding:"4px 8px",fontSize:13,
                      border:`1.5px solid ${C.border}`,borderRadius:6,
                      textAlign:"right",fontFamily:font,outline:"none",
                      color:a.color,fontWeight:700}}
                    onBlur={async e=>{
                      await sb.patch(`carrier_surcharges?carrier_code=eq.FLASH&surcharge_code=eq.${a.key.toUpperCase()}`,
                        {default_cost:parseFloat(e.target.value)||0});
                    }}
                    onKeyDown={e=>e.key==="Enter"&&e.target.blur()}
                  />
                  <span style={{fontSize:11,color:C.inkFaint}}>฿</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── DHL Cost ──────────────────────────────────────────────
function DHLCostPage() {
  const [svc, setSvc] = useState("PDO");
  const [tables, setTables] = useState([]);
  const [rates, setRates] = useState({});
  const [loading, setLoading] = useState(true);
  const [xlsxReady, setXlsxReady] = useState(!!window.XLSX);
  const [remoteData, setRemoteData] = useState({cost:40, sell:50});

  const ZONE_BY_SVC = {PDO:["BKK","UPC"], ECO:["BKK","UPC_CE","UPC_NNS"]};
  const ZONE_COLORS = {BKK:"#FFFBEB",UPC:"#F0FDF4",UPC_CE:"#EFF6FF",UPC_NNS:"#FDF4FF"};

  useEffect(()=>{
    if(!window.XLSX){const s=document.createElement("script");
      s.src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
      s.onload=()=>setXlsxReady(true);document.head.appendChild(s);}
    loadData();
  },[]);

  const loadData = async () => {
    setLoading(true);
    const data=await sb.get("dhl_cost_tables?is_active=eq.true&order=service_type");
    setTables(Array.isArray(data)?data:[]);
    const rMap={};
    for(const t of(Array.isArray(data)?data:[])){
      const r=await sb.get(`dhl_cost_rates?cost_table_id=eq.${t.id}&order=weight_g_from.asc`);
      rMap[t.id]=Array.isArray(r)?r:[];
    }
    setRates(rMap); setLoading(false);
  };

  const getTable = s => tables.find(t=>t.service_type===s);

  const handleImport = async (e) => {
    const file=e.target.files[0]; if(!file||!window.XLSX) return;
    const reader=new FileReader();
    reader.onload=async(ev)=>{
      try {
        const wb=window.XLSX.read(ev.target.result,{type:"array"});
        const sheetNames=wb.SheetNames;

        // ── ตรวจ format: ไฟล์รวม (มี sheet ทุนDHL) หรือ Rate Card จริง (Table 1)
        const combinedPDO=sheetNames.find(s=>s.includes("ทุนDHL PDO"));
        const combinedECO=sheetNames.find(s=>s.includes("ทุนDHL")&&!s.includes("PDO"));
        const isRateCard=sheetNames.includes("Table 1");

        if(combinedPDO||combinedECO) {
          // ── ไฟล์รวม Flash DHL Offline — weight เป็น KG
          let total=0;
          for(const [sheetName,svcType] of [[combinedPDO,"PDO"],[combinedECO,"ECO"]]) {
            if(!sheetName) continue;
            const ws=wb.Sheets[sheetName];
            const raw=window.XLSX.utils.sheet_to_json(ws,{header:1,defval:""});
            // row0=header: Weight(g), Dimension, BKK, SH(C,E)/UPC, LH(N,NE,S)
            const hdr=raw[0]; const colMap={};
            hdr.forEach((v,j)=>{const s=String(v).trim();
              if(s==="BKK") colMap.BKK=j;
              else if(s.includes("C,E")||s.includes("SH")) colMap.UPC_CE=j;
              else if(s.includes("N, NE")||s.includes("LH")) colMap.UPC_NNS=j;
              else if(s==="UPC") colMap.UPC=j;
            });
            const rData=[];
            for(let i=1;i<raw.length;i++){
              const row=raw[i]; const kg=parseFloat(String(row[0]).trim());
              if(!kg||isNaN(kg)) continue;
              // weight เป็น KG — แปลงเป็น gram range
              const from=Math.round((kg-1)*1000)+1; const to=Math.round(kg*1000);
              const entry={weight_g_from:from===1?0:from, weight_g_to:to};
              Object.entries(colMap).forEach(([z,c])=>{entry[`cost_${z.toLowerCase()}`]=parseFloat(row[c])||0;});
              rData.push(entry);
            }
            if(!rData.length) continue;
            const tRes=await fetch(`${SUPABASE_URL}/rest/v1/dhl_cost_tables`,{
              method:"POST",headers:{...sbHeaders(getToken()),Prefer:"resolution=merge-duplicates,return=representation"},
              body:JSON.stringify({ekp_no:`COMBINED_${svcType}`,service_type:svcType,
                account_name:`WhaleFast DHL (${svcType})`,is_active:true}),
            });
            const tData=await tRes.json();
            const tableId=Array.isArray(tData)?tData[0]?.id:tData?.id; if(!tableId) continue;
            await sb.del(`dhl_cost_rates?cost_table_id=eq.${tableId}`);
            const batch=rData.map(r=>({...r,cost_table_id:tableId}));
            for(let i=0;i<batch.length;i+=50)
              await fetch(`${SUPABASE_URL}/rest/v1/dhl_cost_rates`,{method:"POST",headers:sbHeaders(getToken()),body:JSON.stringify(batch.slice(i,i+50))});
            total+=rData.length;
          }
          alert(`✅ Import DHL จากไฟล์รวม สำเร็จ ${total} rows`); loadData(); return;
        }

        if(isRateCard) {
          // ── Rate Card จริงจาก DHL — weight เป็น gram range เช่น "0 - 250"
          const ws=wb.Sheets["Table 1"];
          const raw=window.XLSX.utils.sheet_to_json(ws,{header:1,defval:""});
          let ekpNo="",svcType="PDO";
          for(const row of raw){
            for(const cell of row){
              const s=String(cell).trim();
              if(/^\d{10}$/.test(s)) ekpNo=s;
              if(s==="ECO") svcType="ECO";
              if(s==="PDO") svcType="PDO";
            }
            if(ekpNo) break;
          }
          // หา header row (มีคำว่า Weight และ BKK)
          let headerRow=-1;
          for(let i=0;i<raw.length;i++){
            const r=raw[i];
            if(String(r[0]).includes("Weight")&&r.some(v=>String(v).trim()==="BKK")){headerRow=i;break;}
          }
          if(headerRow<0){alert("ไม่พบ header row");return;}
          const hdr=raw[headerRow]; const colMap={};
          hdr.forEach((v,j)=>{const s=String(v).trim();
            if(s==="BKK") colMap.BKK=j;
            else if(s.includes("C,E")||s.includes("SH")) colMap.UPC_CE=j;
            else if(s.includes("N, NE")||s.includes("LH")) colMap.UPC_NNS=j;
            else if(s==="UPC"&&!colMap.UPC) colMap.UPC=j;
          });
          const rData=[];
          for(let i=headerRow+1;i<raw.length;i++){
            const row=raw[i]; const wt=String(row[0]).trim();
            if(!wt||!wt.includes("-")) continue;
            const parts=wt.split("-");
            const from=parseInt(parts[0].replace(/[^0-9]/g,""))||0;
            const to=parseInt(parts[1]?.replace(/[^0-9]/g,""));
            if(!to||isNaN(to)) continue;
            const entry={weight_g_from:from,weight_g_to:to};
            Object.entries(colMap).forEach(([z,c])=>{entry[`cost_${z.toLowerCase()}`]=parseFloat(row[c])||0;});
            if(Object.values(entry).some((v,i)=>i>1&&v>0)) rData.push(entry);
          }
          if(!rData.length){alert("ไม่พบข้อมูลราคา");return;}
          const tRes=await fetch(`${SUPABASE_URL}/rest/v1/dhl_cost_tables`,{
            method:"POST",headers:{...sbHeaders(getToken()),Prefer:"resolution=merge-duplicates,return=representation"},
            body:JSON.stringify({ekp_no:ekpNo||`RC_${svcType}`,service_type:svcType,
              account_name:`WhaleFast DHL (${svcType})`,is_active:true}),
          });
          const tData=await tRes.json();
          const tableId=Array.isArray(tData)?tData[0]?.id:tData?.id;
          if(!tableId){alert("สร้างตารางไม่สำเร็จ");return;}
          await sb.del(`dhl_cost_rates?cost_table_id=eq.${tableId}`);
          const batch=rData.map(r=>({...r,cost_table_id:tableId}));
          for(let i=0;i<batch.length;i+=50)
            await fetch(`${SUPABASE_URL}/rest/v1/dhl_cost_rates`,{method:"POST",headers:sbHeaders(getToken()),body:JSON.stringify(batch.slice(i,i+50))});
          alert(`✅ Import DHL ${svcType} (EKP: ${ekpNo}) สำเร็จ ${rData.length} rows`);
          loadData(); return;
        }

        alert("ไม่รู้จัก format ไฟล์นี้ — ลองไฟล์ Rate Card จาก DHL หรือไฟล์ราคาทุนรวม");
      } catch(err){alert("Error: "+err.message);}
      e.target.value="";
    };
    reader.readAsArrayBuffer(file);
  };

  const curTable=getTable(svc);
  const curRates=curTable?(rates[curTable.id]||[]):[];
  const curZones=ZONE_BY_SVC[svc];

  return (
    <div style={{padding:"24px 32px",fontFamily:font}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
        <div>
          <h3 style={{fontSize:18,fontWeight:700,color:C.ink,margin:"0 0 4px",letterSpacing:"-0.3px"}}>
            DHL — ราคาทุน
          </h3>
          <div style={{fontSize:12,color:C.inkMid}}>คิดตาม gram · Import จาก Rate Card DHL โดยตรง</div>
        </div>
        <label style={{padding:"7px 16px",fontSize:12,borderRadius:8,
          border:`1.5px solid ${C.blue}`,color:C.blue,cursor:xlsxReady?"pointer":"default",
          fontFamily:font,fontWeight:600,background:C.surface}}>
          📥 Import Rate Card (.xlsx)
          <input type="file" accept=".xlsx" onChange={handleImport} disabled={!xlsxReady} style={{display:"none"}}/>
        </label>
      </div>

      <div style={{display:"flex",gap:6,marginBottom:16}}>
        {[{key:"PDO",label:"PDO — 2 zones",c:C.blue},{key:"ECO",label:"ECO — 3 zones",c:C.green}].map(s=>(
          <button key={s.key} onClick={()=>setSvc(s.key)}
            style={{padding:"7px 20px",fontSize:13,borderRadius:8,border:"none",cursor:"pointer",
              fontFamily:font,fontWeight:600,background:svc===s.key?s.c:C.bg,
              color:svc===s.key?"#fff":C.inkMid,
              outline:svc===s.key?"none":`1.5px solid ${C.border}`}}>{s.label}</button>
        ))}
      </div>

      <Card style={{padding:0,overflow:"hidden",marginBottom:12}}>
        <div style={{padding:"12px 20px",borderBottom:`1px solid ${C.border}`,
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:13,fontWeight:700,color:C.ink}}>DHL {svc}</span>
            {curTable&&<span style={{fontSize:11,color:C.inkFaint}}>
              EKP: {curTable.ekp_no} · {curRates.length} rows</span>}
            {!curTable&&<span style={{fontSize:11,color:C.amber}}>
              ⚠ ยังไม่มีข้อมูล — กด Import Rate Card</span>}
          </div>
        </div>
        {loading?<Spinner/>:curRates.length===0?(
          <div style={{padding:32,textAlign:"center",color:C.inkFaint,fontSize:13}}>
            Import Rate Card จาก DHL เพื่อดูตาราง
          </div>
        ):(
          <div style={{overflowX:"auto",maxHeight:460,overflowY:"auto"}}>
            <table style={{borderCollapse:"collapse",fontSize:12,width:"100%"}}>
              <thead style={{position:"sticky",top:0,zIndex:1}}>
                <tr>
                  <th style={{padding:"8px 16px",background:C.bg,border:`1px solid ${C.border}`,
                    color:C.inkFaint,fontWeight:700,fontSize:11,whiteSpace:"nowrap"}}>น้ำหนัก (g)</th>
                  <th style={{padding:"8px 12px",background:C.bg,border:`1px solid ${C.border}`,
                    color:C.inkFaint,fontWeight:700,fontSize:11,textAlign:"center",minWidth:90,whiteSpace:"nowrap"}}>ขนาด (cm)</th>
                  {curZones.map(z=>(
                    <th key={z} style={{padding:"8px 32px",background:ZONE_COLORS[z],
                      border:`1px solid ${C.border}`,color:C.ink,fontWeight:700,
                      fontSize:11,textAlign:"center",minWidth:110}}>{z}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {curRates.map((row,i)=>{
                  const gTo=row.weight_g_to;
                  const dim=gTo<=1000?"≤70":gTo<=2000?"≤80":gTo<=5000?"≤90":gTo<=10000?"≤100":gTo<=15000?"≤110":gTo<=20000?"≤120":"≤130";
                  return (
                  <tr key={row.id} style={{background:i%2===0?C.bg+"80":"white"}}>
                    <td style={{padding:"4px 16px",border:`1px solid ${C.borderFaint}`,
                      fontWeight:600,color:C.inkMid,whiteSpace:"nowrap"}}>
                      {row.weight_g_from.toLocaleString()}–{row.weight_g_to.toLocaleString()}
                    </td>
                    <td style={{padding:"4px 12px",border:`1px solid ${C.borderFaint}`,
                      textAlign:"center",fontSize:11,color:C.inkFaint}}>{dim}</td>
                    {curZones.map(z=>{
                      const field=`cost_${z.toLowerCase()}`;
                      const val=row[field]||0;
                      return(
                        <td key={z} style={{padding:"1px 2px",border:`1px solid ${C.borderFaint}`,
                          background:val>0?"#FAFFFC":"transparent"}}>
                          <EditCell value={val} color={C.blue}
                            onSave={async price=>{
                              await sb.patch(`dhl_cost_rates?id=eq.${row.id}`,{[field]:price});
                              setRates(p=>({...p,[curTable.id]:p[curTable.id].map(r=>
                                r.id===row.id?{...r,[field]:price}:r)}));
                            }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <div style={{fontSize:13,fontWeight:700,color:C.ink,marginBottom:14}}>
          ค่าพื้นที่ห่างไกล DHL (Remote Area) — 326 ตำบล
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {[{label:"ต้นทุน",field:"cost",val:remoteData.cost,color:C.inkMid},
            {label:"ราคาขาย default",field:"sell",val:remoteData.sell,color:C.green}].map(f=>(
            <div key={f.label} style={{border:`1.5px solid ${C.border}`,borderRadius:10,padding:"14px 16px"}}>
              <div style={{fontSize:11,color:C.inkFaint,marginBottom:8,textTransform:"uppercase",
                letterSpacing:"0.05em",fontWeight:700}}>{f.label}</div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <input type="number" defaultValue={f.val}
                  style={{width:80,padding:"6px 10px",fontSize:15,border:`1.5px solid ${C.border}`,
                    borderRadius:6,textAlign:"right",fontFamily:font,outline:"none",
                    color:f.color,fontWeight:700}}
                  onBlur={e=>setRemoteData(p=>({...p,[f.field]:parseFloat(e.target.value)||0}))}
                  onKeyDown={e=>e.key==="Enter"&&e.target.blur()}
                />
                <span style={{fontSize:12,color:C.inkFaint}}>฿/ชิ้น</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── SPX Cost ──────────────────────────────────────────────
function SPXCostPage() {
  const [tables, setTables] = useState([]);
  const [rates, setRates] = useState({});
  const [loading, setLoading] = useState(true);
  const [xlsxReady, setXlsxReady] = useState(!!window.XLSX);
  const [remote, setRemote] = useState(50);

  const ZONES=["BKK","UPC"];
  const ZONE_COLORS={BKK:"#FFFBEB",UPC:"#F0FDF4"};

  useEffect(()=>{
    if(!window.XLSX){const s=document.createElement("script");
      s.src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
      s.onload=()=>setXlsxReady(true);document.head.appendChild(s);}
    loadData();
  },[]);

  const loadData = async () => {
    setLoading(true);
    const data=await sb.get("price_tables?carrier_code=eq.SPX&order=zone");
    setTables(Array.isArray(data)?data:[]);
    const rMap={};
    for(const t of(Array.isArray(data)?data:[])){
      const r=await sb.get(`price_table_rates?price_table_id=eq.${t.id}&order=weight_kg.asc`);
      rMap[t.id]=Array.isArray(r)?r:[];
    }
    setRates(rMap); setLoading(false);
  };

  const getTable = z => tables.find(t=>t.zone===z);
  const getRate = (tid,kg) => (rates[tid]||[]).find(r=>r.weight_kg===kg)?.cost_price||0;

  const ensureTable = async z => {
    const ex=getTable(z); if(ex) return ex.id;
    const res=await fetch(`${SUPABASE_URL}/rest/v1/price_tables`,{
      method:"POST",headers:{...sbHeaders(getToken()),Prefer:"return=representation"},
      body:JSON.stringify({carrier_code:"SPX",zone:z,table_name:`SPX ${z}`,is_active:true}),
    });
    const d=await res.json(); const t=Array.isArray(d)?d[0]:d;
    if(t?.id){setTables(p=>[...p,t]);setRates(p=>({...p,[t.id]:[]}));return t.id;}
    return null;
  };

  const updateRate = async (tid,kg,price) => {
    const ex=(rates[tid]||[]).find(r=>r.weight_kg===kg);
    if(ex){
      await sb.patch(`price_table_rates?id=eq.${ex.id}`,{cost_price:price});
      setRates(p=>({...p,[tid]:p[tid].map(r=>r.weight_kg===kg?{...r,cost_price:price}:r)}));
    } else {
      const res=await fetch(`${SUPABASE_URL}/rest/v1/price_table_rates`,{
        method:"POST",headers:{...sbHeaders(getToken()),Prefer:"return=representation"},
        body:JSON.stringify({price_table_id:tid,weight_kg:kg,cost_price:price}),
      });
      const nr=await res.json();
      if(Array.isArray(nr)&&nr[0]) setRates(p=>({...p,[tid]:[...(p[tid]||[]),nr[0]]}));
    }
  };

  const handleImport = async e => {
    const file=e.target.files[0]; if(!file||!window.XLSX) return;
    const reader=new FileReader();
    reader.onload=async ev=>{
      try {
        const wb=window.XLSX.read(ev.target.result,{type:"array"});
        const sheetNames=wb.SheetNames;
        // ตรวจว่าเป็นไฟล์ต้นฉบับ SPX (มี sheet "ทุน") หรือ template ของเรา
        const origSheet=sheetNames.find(s=>s==="ทุน"||s.includes("ทุน"));
        let count=0;

        if(origSheet) {
          // ── ไฟล์ต้นฉบับ SPX: row1=header1, row2=header2, row3+=data
          // col3(idx2)=kg, col5(idx4)=BKK cost, col6(idx5)=UPC cost
          const ws=wb.Sheets[origSheet];
          const raw=window.XLSX.utils.sheet_to_json(ws,{header:1,defval:""});
          for(let i=2;i<raw.length;i++){
            const r=raw[i];
            const kg=parseInt(String(r[2]).trim()); if(!kg||isNaN(kg)) continue;
            const bkk=parseFloat(r[4])||0;
            const upc=parseFloat(r[5])||0;
            if(bkk>0){const tid=await ensureTable("BKK");if(tid)await updateRate(tid,kg,bkk);count++;}
            if(upc>0){const tid=await ensureTable("UPC");if(tid)await updateRate(tid,kg,upc);count++;}
          }
        } else {
          // ── Template format: col kg, BKK, UPC
          const ws=wb.Sheets[sheetNames[0]];
          const rows=window.XLSX.utils.sheet_to_json(ws,{defval:0});
          for(const row of rows){
            const kg=parseInt(row["kg"]||row["KG"])||0; if(!kg) continue;
            for(const z of ZONES){
              const price=parseFloat(row[z])||0;
              if(price>0){const tid=await ensureTable(z);if(tid){await updateRate(tid,kg,price);count++;}}
            }
          }
        }
        alert(`✅ Import SPX สำเร็จ ${count} rates`); loadData();
      } catch(err){alert("Error: "+err.message);}
      e.target.value="";
    };
    reader.readAsArrayBuffer(file);
  };

  const handleTemplate = () => {
    if(!window.XLSX) return;
    const rows=Array.from({length:50},(_,i)=>{
      const row={kg:i+1};
      ZONES.forEach(z=>{const t=getTable(z);row[z]=t?(getRate(t.id,i+1)||""):"";});
      return row;
    });
    const ws=window.XLSX.utils.json_to_sheet(rows,{header:["kg",...ZONES]});
    const wb=window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb,ws,"SPX Cost");
    window.XLSX.writeFile(wb,"spx_cost_template.xlsx");
  };

  return (
    <div style={{padding:"24px 32px",fontFamily:font}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
        <div>
          <h3 style={{fontSize:18,fontWeight:700,color:C.ink,margin:"0 0 4px",letterSpacing:"-0.3px"}}>
            SPX (Shopee Express) — ราคาทุน
          </h3>
          <div style={{fontSize:12,color:C.inkMid}}>zone BKK/UPC · kg 1–50</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <label style={{padding:"7px 16px",fontSize:12,borderRadius:8,
            border:`1.5px solid ${C.blue}`,color:C.blue,cursor:xlsxReady?"pointer":"default",
            fontFamily:font,fontWeight:600,background:C.surface}}>
            📥 Import (.xlsx)
            <input type="file" accept=".xlsx" onChange={handleImport} disabled={!xlsxReady} style={{display:"none"}}/>
          </label>
          <Btn variant="ghost" onClick={handleTemplate} disabled={!xlsxReady}>📤 Template</Btn>
        </div>
      </div>

      <Card style={{padding:0,overflow:"hidden",marginBottom:12}}>
        <div style={{overflowX:"auto",maxHeight:460,overflowY:"auto"}}>
          <table style={{borderCollapse:"collapse",fontSize:12,width:"100%"}}>
            <thead style={{position:"sticky",top:0,zIndex:1}}>
              <tr>
                <th style={{padding:"8px 16px",background:C.bg,border:`1px solid ${C.border}`,
                  color:C.inkFaint,fontWeight:700,fontSize:11,textAlign:"center",minWidth:56}}>KG</th>
                <th style={{padding:"8px 12px",background:C.bg,border:`1px solid ${C.border}`,
                  color:C.inkFaint,fontWeight:700,fontSize:11,textAlign:"center",minWidth:80}}>ขนาด (cm)</th>
                {ZONES.map(z=>(
                  <th key={z} style={{padding:"8px 32px",background:ZONE_COLORS[z],
                    border:`1px solid ${C.border}`,color:C.ink,fontWeight:700,
                    fontSize:11,textAlign:"center",minWidth:110}}>{z}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({length:50},(_,i)=>i+1).map(kg=>{
                const size=kg<=20?`${95+kg*5}`:"-";
                return (
                <tr key={kg} style={{background:kg%2===0?C.bg+"80":"white"}}>
                  <td style={{padding:"2px 16px",border:`1px solid ${C.borderFaint}`,
                    textAlign:"center",fontWeight:700,color:C.inkMid}}>{kg}</td>
                  <td style={{padding:"2px 12px",border:`1px solid ${C.borderFaint}`,
                    textAlign:"center",fontSize:11,color:C.inkFaint}}>{size}</td>
                  {ZONES.map(z=>{
                    const t=getTable(z); const val=t?getRate(t.id,kg):0;
                    return(
                      <td key={z} style={{padding:"1px 2px",border:`1px solid ${C.borderFaint}`,
                        background:val>0?"#FAFFFC":"transparent"}}>
                        {loading?<span style={{display:"block",padding:"3px 10px",color:C.inkFaint,fontSize:11}}>...</span>:
                        <EditCell value={val} color={C.red}
                          onSave={async price=>{const tid=t?.id||await ensureTable(z);if(tid)await updateRate(tid,kg,price);}}
                        />}
                      </td>
                    );
                  })}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div style={{fontSize:13,fontWeight:700,color:C.ink,marginBottom:14}}>
          ค่าพื้นที่ห่างไกล SPX (Remote Area)
        </div>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <div style={{border:`1.5px solid ${C.red}25`,borderRadius:10,padding:"14px 20px",
            background:`${C.red}08`,flex:1}}>
            <div style={{fontSize:11,color:C.red,fontWeight:700,marginBottom:8}}>Remote Area</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:11,color:C.inkMid}}>บวกเพิ่ม/ชิ้น</span>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <input type="number" defaultValue={50}
                  style={{width:60,padding:"4px 8px",fontSize:13,
                    border:`1.5px solid ${C.border}`,borderRadius:6,
                    textAlign:"right",fontFamily:font,outline:"none",
                    color:C.red,fontWeight:700}}
                  onBlur={e=>setRemote(parseFloat(e.target.value)||0)}
                  onKeyDown={e=>e.key==="Enter"&&e.target.blur()}
                />
                <span style={{fontSize:11,color:C.inkFaint}}>฿</span>
              </div>
            </div>
          </div>
          <div style={{fontSize:12,color:C.inkFaint,flex:2}}>
            ค่าพื้นที่ห่างไกลจะถูกบวกเพิ่มจากราคาปกติ<br/>
            ดูรายชื่อตำบลได้ที่หน้า Surcharge
          </div>
        </div>
      </Card>
    </div>
  );
}

// ── Fulfillment ───────────────────────────────────────────
function FulfillmentCostPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newForm, setNewForm] = useState({name:"",unit:"",price:""});

  useEffect(()=>{loadData();},[]);

  const loadData = async () => {
    setLoading(true);
    const data=await sb.get("fulfillment_services?order=sort_order,created_at");
    setServices(Array.isArray(data)?data:[]); setLoading(false);
  };

  const handleAdd = async () => {
    if(!newForm.name) return;
    try {
      await sb.post("fulfillment_services",{
        service_name:newForm.name, unit:newForm.unit,
        default_cost:parseFloat(newForm.price)||0, is_active:true,
      });
      setShowAdd(false); setNewForm({name:"",unit:"",price:""}); loadData();
    } catch(e){alert("Error: "+e.message);}
  };

  return (
    <div style={{padding:"24px 32px",fontFamily:font}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
        <div>
          <h3 style={{fontSize:18,fontWeight:700,color:C.ink,margin:"0 0 4px",letterSpacing:"-0.3px"}}>
            Fulfillment — ค่าบริการ
          </h3>
          <div style={{fontSize:12,color:C.inkMid}}>เพิ่ม/จัดการ service และราคา default</div>
        </div>
        <Btn onClick={()=>setShowAdd(!showAdd)}>+ เพิ่ม Service</Btn>
      </div>

      {showAdd&&(
        <Card style={{marginBottom:16,background:C.greenBg,border:`1.5px solid ${C.green}40`}}>
          <div style={{fontSize:13,fontWeight:700,color:C.green,marginBottom:12}}>เพิ่ม Service ใหม่</div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:12,marginBottom:12}}>
            <FieldGroup label="ชื่อ Service">
              <Input value={newForm.name} onChange={e=>setNewForm({...newForm,name:e.target.value})}
                placeholder="เช่น ตรวจสอบสินค้า (QC)"/>
            </FieldGroup>
            <FieldGroup label="หน่วย">
              <Input value={newForm.unit} onChange={e=>setNewForm({...newForm,unit:e.target.value})}
                placeholder="ชิ้น / ออเดอร์ / ลัง"/>
            </FieldGroup>
            <FieldGroup label="ราคา default (฿)">
              <Input value={newForm.price} onChange={e=>setNewForm({...newForm,price:e.target.value})}
                placeholder="0" type="number"/>
            </FieldGroup>
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn onClick={handleAdd}>บันทึก</Btn>
            <Btn variant="ghost" onClick={()=>{setShowAdd(false);setNewForm({name:"",unit:"",price:""});}}>ยกเลิก</Btn>
          </div>
        </Card>
      )}

      <Card style={{padding:0,overflow:"hidden"}}>
        {loading?<Spinner/>:services.length===0?(
          <div style={{padding:32,textAlign:"center",color:C.inkFaint,fontSize:13}}>
            ยังไม่มี service — กด + เพิ่ม Service เพื่อเริ่ม
          </div>
        ):(
          <table style={{borderCollapse:"collapse",fontSize:13,width:"100%"}}>
            <thead>
              <tr style={{background:C.bg}}>
                {["ชื่อ Service","หน่วย","ราคา default (฿)","สถานะ",""].map(h=>(
                  <th key={h} style={{padding:"10px 20px",textAlign:"left",
                    borderBottom:`1.5px solid ${C.border}`,fontSize:11,fontWeight:700,
                    color:C.inkFaint,textTransform:"uppercase",letterSpacing:"0.05em"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {services.map(s=>(
                <tr key={s.id} style={{borderBottom:`1px solid ${C.borderFaint}`}}>
                  <td style={{padding:"12px 20px",color:C.ink,fontWeight:500}}>{s.service_name}</td>
                  <td style={{padding:"12px 20px",color:C.inkMid,fontSize:12}}>{s.unit||"—"}</td>
                  <td style={{padding:"8px 20px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      <input type="number" defaultValue={s.default_cost}
                        style={{width:72,padding:"5px 8px",fontSize:13,
                          border:`1.5px solid ${C.border}`,borderRadius:6,
                          textAlign:"right",fontFamily:font,outline:"none",
                          color:C.green,fontWeight:700}}
                        onBlur={async e=>await sb.patch(`fulfillment_services?id=eq.${s.id}`,
                          {default_cost:parseFloat(e.target.value)||0})}
                        onKeyDown={e=>e.key==="Enter"&&e.target.blur()}
                      />
                      <span style={{fontSize:11,color:C.inkFaint}}>฿</span>
                    </div>
                  </td>
                  <td style={{padding:"12px 20px"}}>
                    <span style={{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:99,
                      background:s.is_active?C.greenBg:C.slateBg,
                      color:s.is_active?C.green:C.slate,cursor:"pointer"}}
                      onClick={async()=>{
                        await sb.patch(`fulfillment_services?id=eq.${s.id}`,{is_active:!s.is_active});
                        setServices(p=>p.map(x=>x.id===s.id?{...x,is_active:!x.is_active}:x));
                      }}>
                      {s.is_active?"ใช้งาน":"ปิด"}
                    </span>
                  </td>
                  <td style={{padding:"12px 20px",textAlign:"right"}}>
                    <span style={{fontSize:11,color:C.red,cursor:"pointer"}}
                      onClick={async()=>{
                        if(!confirm("ลบ service นี้?")) return;
                        await sb.del(`fulfillment_services?id=eq.${s.id}`);
                        setServices(p=>p.filter(x=>x.id!==s.id));
                      }}>ลบ</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <div style={{marginTop:10,fontSize:11,color:C.inkFaint}}>
        ราคา default ใช้กับลูกค้าทั่วไป · override ต่อลูกค้าได้ที่หน้าลูกค้า
      </div>
    </div>
  );
}

// ── Cost Pricing Main Page ─────────────────────────────────
const COST_CARRIERS = [
  {key:"flash",       label:"Flash",       icon:"⚡", color:C.amber},
  {key:"dhl",         label:"DHL",         icon:"📦", color:C.blue},
  {key:"spx",         label:"SPX",         icon:"🛍", color:C.red},
  {key:"fulfillment", label:"Fulfillment", icon:"🏭", color:C.slate},
];

function CostPricingPage() {
  const [carrier, setCarrier] = useState("flash");
  const pages = {
    flash:       <FlashCostPage/>,
    dhl:         <DHLCostPage/>,
    spx:         <SPXCostPage/>,
    fulfillment: <FulfillmentCostPage/>,
  };

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:font}}>
      {/* Header + tabs */}
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`}}>
        <div style={{padding:"20px 32px 0"}}>
          <h2 style={{fontSize:22,fontWeight:700,color:C.ink,margin:"0 0 16px",letterSpacing:"-0.5px"}}>
            ราคาทุนขนส่ง
          </h2>
          <div style={{display:"flex",gap:0}}>
            {COST_CARRIERS.map(c=>(
              <button key={c.key} onClick={()=>setCarrier(c.key)}
                style={{padding:"10px 24px",fontSize:13,border:"none",cursor:"pointer",
                  fontFamily:font,fontWeight:carrier===c.key?700:400,
                  background:"transparent",transition:"all 0.15s",
                  color:carrier===c.key?c.color:C.inkMid,
                  borderBottom:carrier===c.key?`2.5px solid ${c.color}`:"2.5px solid transparent",
                  marginBottom:"-1px"}}>
                <span style={{marginRight:6}}>{c.icon}</span>{c.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {pages[carrier]}
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("customers");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = sb.auth.getSession();
    if (saved?.access_token) { setSession(saved); loadUser(saved); }
    else setReady(true);
  }, []);

  const loadUser = async (s) => {
    try {
      const data = await sb.get(`users?id=eq.${s.user.id}&select=*`);
      if (Array.isArray(data) && data.length > 0) setUser(data[0]);
      else setUser({ id:s.user.id, email:s.user.email, name:s.user.email.split("@")[0] });
    } catch {
      setUser({ id:s.user.id, email:s.user.email, name:s.user.email.split("@")[0] });
    }
    setReady(true);
  };

  const handleLogin = (data) => { setSession(data); loadUser(data); };
  const handleLogout = () => { sb.auth.signOut(); setSession(null); setUser(null); setReady(true); };

  if (!ready) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
      minHeight:"100vh", fontFamily:font, color:C.inkFaint, fontSize:15 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Noto+Sans+Thai:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
      กำลังโหลด WhaleFast CRM...
    </div>
  );

  if (!session) return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Noto+Sans+Thai:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
      <LoginPage onLogin={handleLogin}/>
    </>
  );

  const PAGES = {
    customers:    <CustomersPage/>,
    cost_pricing: <CostPricingPage/>,
    sell_pricing: <PlaceholderPage title="ราคาขาย" icon="◑"/>,
    carriers:     <PlaceholderPage title="ข้อมูลขนส่ง" icon="▷"/>,
  };

  return (
    <AuthCtx.Provider value={{ session, user }}>
      <div style={{ fontFamily:font, background:C.bg, minHeight:"100vh" }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Noto+Sans+Thai:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
        <Sidebar page={page} setPage={setPage} user={user} onLogout={handleLogout}/>
        <div style={{ marginLeft:220, minHeight:"100vh" }}>
          {PAGES[page] || PAGES.customers}
        </div>
      </div>
    </AuthCtx.Provider>
  );
}
