import { useState, useEffect, useCallback, createContext, useContext } from "react";

// ============================================================
// SUPABASE CLIENT
// ============================================================
const SUPABASE_URL = "https://tdkppvsnlyqkgxrqmuat.supabase.co";
const SUPABASE_KEY = "sb_publishable_pIWup7aav3nQVtvXXiYFJA_9QimJSIW";

const supabaseHeaders = (token) => ({
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${token || SUPABASE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
});

const supabase = {
  auth: {
    signIn: async (email, password) => {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error_description || data.msg || "Login failed");
      return data;
    },
    signOut: () => {
      localStorage.removeItem("wf_session");
    },
    getSession: () => {
      try {
        return JSON.parse(localStorage.getItem("wf_session"));
      } catch {
        return null;
      }
    },
  },
  from: (table) => {
    const session = JSON.parse(localStorage.getItem("wf_session") || "null");
    const token = session?.access_token;
    return {
      select: async (columns = "*", params = {}) => {
        let url = `${SUPABASE_URL}/rest/v1/${table}?select=${columns}`;
        Object.entries(params).forEach(([k, v]) => {
          url += `&${k}=${v}`;
        });
        const res = await fetch(url, { headers: supabaseHeaders(token) });
        if (!res.ok) return [];
        return res.json();
      },
      selectWithCount: async (columns = "*", params = {}) => {
        let url = `${SUPABASE_URL}/rest/v1/${table}?select=${columns}`;
        Object.entries(params).forEach(([k, v]) => {
          url += `&${k}=${v}`;
        });
        const headers = { ...supabaseHeaders(token), Prefer: "count=exact" };
        const res = await fetch(url, { headers });
        if (!res.ok) return { data: [], count: 0 };
        const contentRange = res.headers.get("content-range");
        const count = contentRange ? parseInt(contentRange.split("/")[1]) || 0 : 0;
        const data = await res.json();
        return { data, count };
      },
      insert: async (rows) => {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
          method: "POST",
          headers: supabaseHeaders(token),
          body: JSON.stringify(rows),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Insert failed");
        }
        return res.json();
      },
      update: async (data, match) => {
        let url = `${SUPABASE_URL}/rest/v1/${table}?`;
        Object.entries(match).forEach(([k, v]) => {
          url += `${k}=eq.${v}&`;
        });
        const res = await fetch(url, {
          method: "PATCH",
          headers: supabaseHeaders(token),
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Update failed");
        return res.json();
      },
      delete: async (match) => {
        let url = `${SUPABASE_URL}/rest/v1/${table}?`;
        Object.entries(match).forEach(([k, v]) => {
          url += `${k}=eq.${v}&`;
        });
        return fetch(url, { method: "DELETE", headers: supabaseHeaders(token) });
      },
    };
  },
  rpc: async (fn, params = {}) => {
    const session = JSON.parse(localStorage.getItem("wf_session") || "null");
    const token = session?.access_token;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: supabaseHeaders(token),
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(`RPC ${fn} failed: ${res.status}`);
    return res.json();
  },
};

// ============================================================
// CONTEXT
// ============================================================
const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

// ============================================================
// STYLES
// ============================================================
const font = "'DM Sans', 'Noto Sans Thai', sans-serif";
const colors = {
  bg: "#f8f7f4",
  card: "#ffffff",
  primary: "#1a6b4f",
  primaryLight: "#e8f5ee",
  primaryDark: "#0f4a35",
  accent: "#e8913a",
  accentLight: "#fef3e2",
  danger: "#c0392b",
  dangerLight: "#fdeaea",
  info: "#2980b9",
  infoLight: "#e8f4fd",
  warning: "#f39c12",
  warningLight: "#fef9e7",
  text: "#2c2c2a",
  textMuted: "#7a7a72",
  textLight: "#a8a8a0",
  border: "#e8e6e0",
  borderLight: "#f0eeea",
};

const css = {
  app: {
    fontFamily: font,
    background: colors.bg,
    minHeight: "100vh",
    color: colors.text,
  },
  // Login
  loginWrap: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
  },
  loginCard: {
    background: colors.card,
    borderRadius: 16,
    padding: "48px 40px",
    width: 400,
    maxWidth: "90vw",
  },
  loginLogo: {
    fontSize: 28,
    fontWeight: 700,
    color: colors.primary,
    textAlign: "center",
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  loginSub: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: 32,
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    border: `1.5px solid ${colors.border}`,
    borderRadius: 10,
    fontSize: 15,
    fontFamily: font,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
    background: colors.bg,
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: colors.textMuted,
    marginBottom: 6,
    display: "block",
  },
  btnPrimary: {
    width: "100%",
    padding: "13px 24px",
    background: colors.primary,
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 600,
    fontFamily: font,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  // Layout
  sidebar: {
    width: 240,
    background: colors.card,
    borderRight: `1px solid ${colors.border}`,
    height: "100vh",
    position: "fixed",
    left: 0,
    top: 0,
    display: "flex",
    flexDirection: "column",
    zIndex: 10,
  },
  main: {
    marginLeft: 240,
    padding: "24px 32px",
    minHeight: "100vh",
  },
  // Cards & metrics
  metricGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 14,
    marginBottom: 20,
  },
  metric: {
    background: colors.card,
    borderRadius: 12,
    padding: "18px 20px",
    border: `1px solid ${colors.borderLight}`,
  },
  card: {
    background: colors.card,
    borderRadius: 14,
    padding: "20px 24px",
    border: `1px solid ${colors.borderLight}`,
    marginBottom: 16,
  },
};

// ============================================================
// COMPONENTS
// ============================================================

// --- Badge ---
function Badge({ children, type = "default" }) {
  const styles = {
    success: { background: colors.primaryLight, color: colors.primary },
    danger: { background: colors.dangerLight, color: colors.danger },
    warning: { background: colors.warningLight, color: colors.warning },
    info: { background: colors.infoLight, color: colors.info },
    default: { background: colors.borderLight, color: colors.textMuted },
  };
  return (
    <span style={{ ...styles[type], fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

// --- Metric Card ---
function MetricCard({ label, value, sub, subType }) {
  return (
    <div style={css.metric}>
      <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>{value}</div>
      {sub && (
        <div style={{ fontSize: 12, marginTop: 4, color: subType === "up" ? colors.primary : subType === "down" ? colors.danger : colors.textMuted }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// --- Simple Table ---
function DataTable({ columns, data, onRowClick }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: font }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{ textAlign: "left", fontWeight: 600, color: colors.textMuted, padding: "8px 10px", borderBottom: `1px solid ${colors.border}`, fontSize: 12 }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={columns.length} style={{ padding: 24, textAlign: "center", color: colors.textLight }}>ยังไม่มีข้อมูล</td></tr>
          ) : (
            data.map((row, i) => (
              <tr key={i} onClick={() => onRowClick?.(row)} style={{ cursor: onRowClick ? "pointer" : "default", transition: "background 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = colors.bg)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                {columns.map((col) => (
                  <td key={col.key} style={{ padding: "10px 10px", borderBottom: `1px solid ${colors.borderLight}` }}>
                    {col.render ? col.render(row[col.key], row) : row[col.key] ?? "-"}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
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
    setLoading(true);
    setError("");
    try {
      const data = await supabase.auth.signIn(email, password);
      localStorage.setItem("wf_session", JSON.stringify(data));
      onLogin(data);
    } catch (err) {
      setError(err.message === "Invalid login credentials" ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง" : err.message);
    }
    setLoading(false);
  };

  return (
    <div style={css.loginWrap}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Noto+Sans+Thai:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={css.loginCard}>
        <div style={css.loginLogo}>WhaleFast</div>
        <div style={css.loginSub}>CRM ระบบจัดการข้อมูลองค์กร</div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={css.label}>อีเมล</label>
            <input style={css.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@company.com" required />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={css.label}>รหัสผ่าน</label>
            <input style={css.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="รหัสผ่าน" required />
          </div>
          {error && (
            <div style={{ background: colors.dangerLight, color: colors.danger, fontSize: 13, padding: "10px 14px", borderRadius: 8, marginBottom: 16 }}>
              {error}
            </div>
          )}
          <button type="submit" style={{ ...css.btnPrimary, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// SIDEBAR
// ============================================================
const menuItems = {
  manager: [
    { key: "dashboard", label: "Dashboard", icon: "◈" },
    { key: "customers", label: "ลูกค้า", icon: "◎" },
    { key: "orders", label: "ออเดอร์", icon: "▤" },
    { key: "invoices", label: "การเงิน", icon: "◇" },
    { key: "expenses", label: "ค่าใช้จ่าย", icon: "▦" },
    { key: "cases", label: "CS/เคส", icon: "◉" },
    { key: "carriers", label: "ขนส่ง", icon: "▷" },
    { key: "activity", label: "Activity Log", icon: "◔" },
  ],
  admin: [
    { key: "dashboard", label: "Dashboard", icon: "◈" },
    { key: "customers", label: "ลูกค้า", icon: "◎" },
    { key: "orders", label: "ออเดอร์/นำเข้า", icon: "▤" },
    { key: "invoices", label: "วางบิล", icon: "◇" },
    { key: "carriers", label: "กระทบยอดขนส่ง", icon: "▷" },
  ],
  accounting: [
    { key: "dashboard", label: "Dashboard", icon: "◈" },
    { key: "invoices", label: "บิลลค./AP", icon: "◇" },
    { key: "expenses", label: "ค่าใช้จ่าย", icon: "▦" },
  ],
  cs: [
    { key: "dashboard", label: "Dashboard", icon: "◈" },
    { key: "customers", label: "ข้อมูลลค.", icon: "◎" },
    { key: "orders", label: "ติดตามพัสดุ", icon: "▤" },
    { key: "cases", label: "เคส/เคลม", icon: "◉" },
  ],
  sales: [
    { key: "dashboard", label: "Dashboard", icon: "◈" },
    { key: "customers", label: "ลูกค้า", icon: "◎" },
    { key: "leads", label: "Pipeline", icon: "◇" },
  ],
};

function Sidebar({ user, currentPage, onNavigate, onLogout }) {
  const role = user?.role || "manager";
  const items = menuItems[role] || menuItems.manager;
  const roleLabels = { manager: "ผู้บริหาร", admin: "Admin", accounting: "บัญชี", cs: "CS/Support", sales: "ฝ่ายขาย" };

  return (
    <div style={css.sidebar}>
      <div style={{ padding: "24px 20px 16px" }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: colors.primary, letterSpacing: -0.5 }}>WhaleFast</div>
        <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>CRM</div>
      </div>
      <div style={{ flex: 1, padding: "0 12px" }}>
        {items.map((item) => (
          <div
            key={item.key}
            onClick={() => onNavigate(item.key)}
            style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
              borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: currentPage === item.key ? 600 : 400,
              color: currentPage === item.key ? colors.primary : colors.text,
              background: currentPage === item.key ? colors.primaryLight : "transparent",
              marginBottom: 2, transition: "all 0.15s",
            }}
          >
            <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{item.icon}</span>
            {item.label}
          </div>
        ))}
      </div>
      <div style={{ padding: "16px 16px 20px", borderTop: `1px solid ${colors.border}` }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.name || "User"}</div>
        <div style={{ fontSize: 11, color: colors.textMuted }}>{roleLabels[role]}</div>
        <div
          onClick={onLogout}
          style={{ fontSize: 12, color: colors.danger, cursor: "pointer", marginTop: 8 }}
        >
          ออกจากระบบ
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DASHBOARD PAGE — FIXED: uses RPC + fallback batch aggregation
// ============================================================
function DashboardPage() {
  const [stats, setStats] = useState({ orders: 0, sales: 0, cod: 0, shippingCost: 0, customers: 0, carriers: 0 });
  const [byCarrier, setByCarrier] = useState({});
  const [bySource, setBySource] = useState({});
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const getDateRange = useCallback(() => {
    const today = new Date();
    const fmt = (d) => d.toISOString().split("T")[0];
    switch (dateRange) {
      case "today": return { start: fmt(today), end: fmt(today) };
      case "7d": { const d = new Date(today); d.setDate(d.getDate() - 7); return { start: fmt(d), end: fmt(today) }; }
      case "30d": { const d = new Date(today); d.setDate(d.getDate() - 30); return { start: fmt(d), end: fmt(today) }; }
      case "month": { const s = new Date(today.getFullYear(), today.getMonth(), 1); return { start: fmt(s), end: fmt(today) }; }
      case "custom": return { start: customStart || null, end: customEnd || null };
      default: return { start: null, end: null };
    }
  }, [dateRange, customStart, customEnd]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();

      // Try RPC first
      let summary = null;
      try {
        summary = await supabase.rpc("get_dashboard_summary", { p_start_date: start, p_end_date: end });
      } catch (e) {
        console.log("RPC not available, using fallback:", e.message);
      }

      if (summary && summary.total_orders !== undefined) {
        // RPC worked
        const [customers, carriers, recentO] = await Promise.all([
          supabase.from("customers").select("id"),
          supabase.from("carriers").select("id,name"),
          supabase.from("orders").select("id,sell_price,ship_date,status,tracking_no,source", { order: "ship_date.desc", limit: 8 }),
        ]);

        setStats({
          orders: summary.total_orders || 0,
          sales: parseFloat(summary.total_revenue) || 0,
          cod: parseFloat(summary.total_cod) || 0,
          shippingCost: parseFloat(summary.total_shipping_fee) || 0,
          customers: Array.isArray(customers) ? customers.length : 0,
          carriers: Array.isArray(carriers) ? carriers.length : 0,
        });
        setByCarrier(summary.orders_by_carrier || {});
        setBySource(summary.orders_by_account || {});
        setRecentOrders(Array.isArray(recentO) ? recentO.slice(0, 8) : []);
      } else {
        // Fallback: batch fetch all orders and aggregate client-side
        await loadFallback(start, end);
      }
    } catch (e) {
      console.error("Dashboard load error:", e);
      // Try fallback
      try { await loadFallback(null, null); } catch (e2) { console.error("Fallback also failed:", e2); }
    }
    setLoading(false);
  }, [getDateRange]);

  const loadFallback = async (start, end) => {
    // Fetch ALL orders in batches of 1000
    const allOrders = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const params = { order: "ship_date.desc", limit: batchSize, offset };
      if (start) params["ship_date"] = `gte.${start}`;
      if (end) params["ship_date"] = end ? `lte.${end}` : undefined;

      // Build URL manually for date range
      let url = `${SUPABASE_URL}/rest/v1/orders?select=sell_price,cod_amount,shipping_cost,ship_date,status,source,tracking_no&order=ship_date.desc&limit=${batchSize}&offset=${offset}`;
      if (start) url += `&ship_date=gte.${start}`;
      if (end) url += `&ship_date=lte.${end}`;

      const session = JSON.parse(localStorage.getItem("wf_session") || "null");
      const token = session?.access_token;
      const res = await fetch(url, { headers: supabaseHeaders(token) });
      const data = await res.json();

      if (!Array.isArray(data) || data.length === 0) { hasMore = false; break; }
      allOrders.push(...data);
      if (data.length < batchSize) hasMore = false;
      else offset += batchSize;
      if (allOrders.length >= 50000) break;
    }

    const [customers, carriers] = await Promise.all([
      supabase.from("customers").select("id"),
      supabase.from("carriers").select("id,name"),
    ]);

    // Aggregate
    const totalSales = allOrders.reduce((s, o) => s + (parseFloat(o.sell_price) || 0), 0);
    const totalCod = allOrders.reduce((s, o) => s + (parseFloat(o.cod_amount) || 0), 0);
    const totalShipping = allOrders.reduce((s, o) => s + (parseFloat(o.shipping_cost) || 0), 0);

    // Group by source
    const srcMap = {};
    const statusMap = {};
    allOrders.forEach(o => {
      const src = o.source || "manual";
      srcMap[src] = (srcMap[src] || 0) + 1;
      const st = o.status || "unknown";
      statusMap[st] = (statusMap[st] || 0) + 1;
    });

    setStats({
      orders: allOrders.length,
      sales: totalSales,
      cod: totalCod,
      shippingCost: totalShipping,
      customers: Array.isArray(customers) ? customers.length : 0,
      carriers: Array.isArray(carriers) ? carriers.length : 0,
    });
    setByCarrier(statusMap);
    setBySource(srcMap);
    setRecentOrders(allOrders.slice(0, 8));
  };

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const fmtMoney = (n) => `\u0E3F${(n || 0).toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  // Simple bar chart
  const BarChart = ({ data, title }) => {
    if (!data || Object.keys(data).length === 0) return null;
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    const maxVal = Math.max(...entries.map(([, v]) => v));
    const barColors = ["#1a6b4f", "#e8913a", "#2980b9", "#8e44ad", "#c0392b", "#27ae60", "#f39c12", "#95a5a6"];
    return (
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: colors.textMuted }}>{title}</div>
        {entries.map(([label, count], i) => (
          <div key={label} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
              <span>{label}</span>
              <span style={{ fontWeight: 600 }}>{count.toLocaleString()}</span>
            </div>
            <div style={{ width: "100%", background: colors.borderLight, borderRadius: 4, height: 8 }}>
              <div style={{ width: `${(count / maxVal) * 100}%`, background: barColors[i % barColors.length], borderRadius: 4, height: 8, transition: "width 0.5s" }} />
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: colors.textMuted }}>กำลังโหลด Dashboard...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3 }}>Dashboard</h2>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            { val: "today", label: "วันนี้" },
            { val: "7d", label: "7 วัน" },
            { val: "30d", label: "30 วัน" },
            { val: "month", label: "เดือนนี้" },
            { val: "all", label: "ทั้งหมด" },
            { val: "custom", label: "กำหนดเอง" },
          ].map(opt => (
            <button
              key={opt.val}
              onClick={() => setDateRange(opt.val)}
              style={{
                padding: "6px 14px", fontSize: 12, borderRadius: 8, border: "none", cursor: "pointer",
                fontFamily: font, fontWeight: 500, transition: "all 0.15s",
                background: dateRange === opt.val ? colors.primary : colors.borderLight,
                color: dateRange === opt.val ? "#fff" : colors.text,
              }}
            >{opt.label}</button>
          ))}
        </div>
      </div>

      {dateRange === "custom" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
          <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{ ...css.input, width: 160, padding: "6px 10px", fontSize: 12 }} />
          <span style={{ color: colors.textMuted, fontSize: 13 }}>ถึง</span>
          <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={{ ...css.input, width: 160, padding: "6px 10px", fontSize: 12 }} />
          <button onClick={loadDashboard} style={{ ...css.btnPrimary, width: "auto", padding: "6px 16px", fontSize: 12 }}>ค้นหา</button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 14, marginBottom: 20 }}>
        <MetricCard label="ออเดอร์ทั้งหมด" value={stats.orders.toLocaleString()} />
        <MetricCard label="ยอดขายรวม" value={fmtMoney(stats.sales)} />
        <MetricCard label="ยอด COD" value={fmtMoney(stats.cod)} />
        <MetricCard label="ต้นทุนขนส่ง" value={fmtMoney(stats.shippingCost)} />
        <MetricCard label="กำไรขนส่ง" value={fmtMoney(stats.sales - stats.shippingCost)} sub={stats.sales > 0 ? `${((stats.sales - stats.shippingCost) / stats.sales * 100).toFixed(1)}%` : null} subType="up" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14, marginBottom: 20 }}>
        <MetricCard label="ลูกค้า" value={stats.customers.toLocaleString()} />
        <MetricCard label="ขนส่ง" value={`${stats.carriers} เจ้า`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={css.card}>
          <BarChart data={bySource} title="ตามแหล่งข้อมูล (Source)" />
          {Object.keys(bySource).length === 0 && <div style={{ color: colors.textLight, fontSize: 13, textAlign: "center", padding: 16 }}>ยังไม่มีข้อมูล</div>}
        </div>
        <div style={css.card}>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: colors.textMuted }}>ออเดอร์ล่าสุด</h3>
          {recentOrders.length === 0 ? (
            <div style={{ color: colors.textLight, fontSize: 13, padding: 16, textAlign: "center" }}>ยังไม่มีออเดอร์</div>
          ) : (
            <DataTable
              columns={[
                { key: "ship_date", label: "วันที่" },
                { key: "tracking_no", label: "Tracking", render: (v) => <span style={{ fontFamily: "monospace", fontSize: 11 }}>{v || "-"}</span> },
                { key: "sell_price", label: "ยอด", render: (v) => fmtMoney(parseFloat(v || 0)) },
                { key: "status", label: "สถานะ", render: (v) => <Badge type={v === "delivered" ? "success" : v === "disputed" ? "danger" : "warning"}>{v}</Badge> },
                { key: "source", label: "แหล่ง", render: (v) => v ? <Badge type="info">{v}</Badge> : "-" },
              ]}
              data={recentOrders}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CUSTOMERS PAGE
// ============================================================
function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ company_name: "", contact_name: "", phone: "", email: "", address: "", payment_terms: "30 วัน" });
  const auth = useAuth();

  useEffect(() => { loadCustomers(); }, []);

  const loadCustomers = async () => {
    const data = await supabase.from("customers").select("*", { order: "created_at.desc" });
    setCustomers(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const handleAdd = async () => {
    try {
      await supabase.from("customers").insert({ ...form, sales_person_id: auth?.user?.id });
      setShowForm(false);
      setForm({ company_name: "", contact_name: "", phone: "", email: "", address: "", payment_terms: "30 วัน" });
      loadCustomers();
    } catch (e) {
      alert("เกิดข้อผิดพลาด: " + e.message);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3 }}>ลูกค้า</h2>
        <button onClick={() => setShowForm(!showForm)} style={{ ...css.btnPrimary, width: "auto", padding: "10px 20px", fontSize: 13 }}>
          + เพิ่มลูกค้า
        </button>
      </div>

      {showForm && (
        <div style={{ ...css.card, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>เพิ่มลูกค้าใหม่</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { key: "company_name", label: "ชื่อบริษัท *", placeholder: "บจ. ..." },
              { key: "contact_name", label: "ชื่อผู้ติดต่อ", placeholder: "ชื่อ-นามสกุล" },
              { key: "phone", label: "เบอร์โทร", placeholder: "0xx-xxx-xxxx" },
              { key: "email", label: "อีเมล", placeholder: "email@company.com" },
              { key: "address", label: "ที่อยู่", placeholder: "ที่อยู่บริษัท" },
              { key: "payment_terms", label: "เงื่อนไขชำระ", placeholder: "30 วัน" },
            ].map((f) => (
              <div key={f.key}>
                <label style={css.label}>{f.label}</label>
                <input style={css.input} placeholder={f.placeholder} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={handleAdd} style={{ ...css.btnPrimary, width: "auto", padding: "10px 24px", fontSize: 13 }}>บันทึก</button>
            <button onClick={() => setShowForm(false)} style={{ ...css.btnPrimary, width: "auto", padding: "10px 24px", fontSize: 13, background: colors.border, color: colors.text }}>ยกเลิก</button>
          </div>
        </div>
      )}

      <div style={css.card}>
        {loading ? (
          <div style={{ textAlign: "center", color: colors.textMuted, padding: 24 }}>กำลังโหลด...</div>
        ) : (
          <DataTable
            columns={[
              { key: "company_name", label: "ชื่อบริษัท" },
              { key: "contact_name", label: "ผู้ติดต่อ" },
              { key: "phone", label: "เบอร์โทร" },
              { key: "email", label: "อีเมล" },
              { key: "payment_terms", label: "เงื่อนไข" },
              { key: "is_active", label: "สถานะ", render: (v) => <Badge type={v ? "success" : "default"}>{v ? "ใช้งาน" : "ปิด"}</Badge> },
            ]}
            data={customers}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================
// CARRIER IMPORT CONFIGS
// ============================================================
const CARRIER_MAPS = {
  DHL: { label:"DHL", sheet:"ข้อมูลรายละเอียด", cols:{ ship_date:"Pick up date", tracking_no:" Tracking Number", order_no:"CustomerTracking Number", customer_name:"Customer Name", recipient_name:"Consignee Name", destination:"Province", weight_kg:"น้ำหนักที่คิดค่าขนส่ง (Kg)", cod_amount:"COD Amount", shipping_cost:"Total", sell_price:"Total รวม Vat" }},
  FLASH: { label:"Flash Express", sheet:"Daily report", cols:{ ship_date:"PU time", tracking_no:"Tracking No.", order_no:"Order No.", customer_name:"Sub-account Name", recipient_name:"Consignee", destination:"Consignee address", weight_kg:"Final Weight", cod_amount:"COD Amt", shipping_cost:"TOTAL Flash", sell_price:"TOTAL", status:"Status" }},
  WEFASTD: { label:"WefastD", sheet:"ข้อมูลรายละเอียด", cols:{ ship_date:"Date", tracking_no:"เลขพัสดุ", order_no:"รหัสอ้างอิง", customer_name:"Customer name", recipient_name:"ผู้รับ", weight_kg:"น้ำหนัก (kg)", shipping_cost:"Grand Total", sell_price:"Grand Total", carrier_sub:"ขนส่ง" }},
  WFG: { label:"WefastGO", sheet:"วางข้อมูล", cols:{ ship_date:"Date", tracking_no:"เลขพัสดุ", order_no:"รหัสลูกค้า", customer_name:"รหัสลูกค้า", destination:"พื้นที่", weight_kg:"น้ำหนัก(KG.)", cod_amount:"COD", shipping_cost:"ทุน(สุทธิ)", sell_price:"Grand Total", status:"สถานะ", carrier_sub:"ขนส่ง" }},
};

function parseDate(v) {
  if (!v) return new Date().toISOString().split("T")[0];
  if (typeof v === "number") { const d = new Date((v - 25569) * 86400000); return d.toISOString().split("T")[0]; }
  const s = String(v).trim().replace(/\\t/g,"");
  if (/^\d{2}\.\d{2}\.\d{4}/.test(s)) { const [d,m,y] = s.split("."); return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`; }
  if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) { const [d,m,y] = s.split("/"); return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`; }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0,10);
  try { const d = new Date(s); if (!isNaN(d)) return d.toISOString().split("T")[0]; } catch {}
  return new Date().toISOString().split("T")[0];
}

// ============================================================
// ORDERS PAGE — FIXED: pagination, search, proper count
// ============================================================
function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [carriers, setCarriers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importCarrier, setImportCarrier] = useState("");
  const [importPreview, setImportPreview] = useState([]);
  const [importTotal, setImportTotal] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [xlsxLoaded, setXlsxLoaded] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [exporting, setExporting] = useState(false);

  const [form, setForm] = useState({
    customer_id: "", carrier_id: "", tracking_no: "", order_no: "", recipient_name: "",
    destination: "", weight_kg: "", cod_amount: "0", shipping_cost: "0", sell_price: "0",
  });
  const auth = useAuth();

  useEffect(() => { loadCarriersAndCustomers(); loadXlsx(); }, []);

  const loadXlsx = () => {
    if (window.XLSX) { setXlsxLoaded(true); return; }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
    s.onload = () => setXlsxLoaded(true);
    document.head.appendChild(s);
  };

  const loadCarriersAndCustomers = async () => {
    const [car, cus] = await Promise.all([
      supabase.from("carriers").select("id,name,code"),
      supabase.from("customers").select("id,company_name"),
    ]);
    setCarriers(Array.isArray(car) ? car : []);
    setCustomers(Array.isArray(cus) ? cus : []);
  };

  // Load orders with pagination and filters
  const loadOrders = useCallback(async () => {
    setLoading(true);
    const session = JSON.parse(localStorage.getItem("wf_session") || "null");
    const token = session?.access_token;

    let url = `${SUPABASE_URL}/rest/v1/orders?select=*,customers(company_name),carriers(name)`;

    // Filters
    if (search) {
      url += `&or=(tracking_no.ilike.*${search}*,recipient_name.ilike.*${search}*,order_no.ilike.*${search}*)`;
    }
    if (dateFilter) url += `&ship_date=gte.${dateFilter}`;
    if (dateEnd) url += `&ship_date=lte.${dateEnd}`;
    if (sourceFilter) url += `&source=eq.${sourceFilter}`;
    if (statusFilter) url += `&status=eq.${statusFilter}`;

    // Sort and pagination
    url += `&order=ship_date.desc,created_at.desc`;
    url += `&limit=${pageSize}&offset=${page * pageSize}`;

    const headers = { ...supabaseHeaders(token), Prefer: "count=exact" };
    try {
      const res = await fetch(url, { headers });
      const contentRange = res.headers.get("content-range");
      const count = contentRange ? parseInt(contentRange.split("/")[1]) || 0 : 0;
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
      setTotalCount(count);
    } catch (e) {
      console.error("Load orders error:", e);
      setOrders([]);
      setTotalCount(0);
    }
    setLoading(false);
  }, [page, pageSize, search, dateFilter, dateEnd, sourceFilter, statusFilter]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [search, dateFilter, dateEnd, sourceFilter, statusFilter, pageSize]);

  const totalPages = Math.ceil(totalCount / pageSize);
  const showFrom = totalCount > 0 ? page * pageSize + 1 : 0;
  const showTo = Math.min((page + 1) * pageSize, totalCount);

  const handleAdd = async () => {
    try {
      await supabase.from("orders").insert({
        ...form, weight_kg: parseFloat(form.weight_kg) || 0,
        cod_amount: parseFloat(form.cod_amount) || 0, shipping_cost: parseFloat(form.shipping_cost) || 0,
        sell_price: parseFloat(form.sell_price) || 0, ship_date: new Date().toISOString().split("T")[0], created_by: auth?.user?.id,
      });
      setShowForm(false);
      setForm({ customer_id: "", carrier_id: "", tracking_no: "", order_no: "", recipient_name: "", destination: "", weight_kg: "", cod_amount: "0", shipping_cost: "0", sell_price: "0" });
      loadOrders();
    } catch (e) { alert("เกิดข้อผิดพลาด: " + e.message); }
  };

  const findCarrierId = (code) => {
    if (!code) return null;
    const c = String(code).toUpperCase();
    const match = carriers.find(cr => {
      const cd = (cr.code||"").toUpperCase();
      if (c.includes("DHL") || c === "ISPDHLND") return cd === "DHL";
      if (c.includes("FLASH") || c === "ISPFLASHD") return cd === "FLASH";
      if (c.includes("KERRY") || c === "ISPKEX" || c.includes("DPKERRY")) return cd === "KERRY";
      if (c.includes("JNT") || c.includes("J&T")) return cd === "JNT";
      if (c.includes("ISPTHPX") || c.includes("ISPTHPZ") || c.includes("ISPBSX") || c.includes("ISPS")) return cd === "WEFASTD";
      if (c.includes("BEST") || c.includes("DPBEST")) return cd === "KERRY";
      if (c.includes("SHOPEE") || c.includes("DPSHOPEE")) return cd === "OFFLINE";
      if (c.includes("THAIPOST") || c.includes("DPTHAIPOST")) return cd === "OFFLINE";
      return false;
    });
    return match?.id || carriers.find(cr => cr.code === "OFFLINE")?.id || null;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !importCarrier || !window.XLSX) return;
    setImportResult(null);
    const config = CARRIER_MAPS[importCarrier];
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = window.XLSX.read(ev.target.result, { type: "array" });
        let sheetName = config.sheet;
        if (!wb.SheetNames.includes(sheetName)) sheetName = wb.SheetNames.find(s => s.includes("report") || s.includes("รายละเอียด") || s.includes("วาง")) || wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const raw = window.XLSX.utils.sheet_to_json(ws, { defval: "" });
        const carrierObj = carriers.find(c => c.code === (importCarrier === "FLASH" ? "FLASH" : importCarrier));
        const carrierId = carrierObj?.id;
        const mapped = raw.map(row => {
          const m = config.cols;
          const getVal = (key) => { const col = m[key]; return col ? (row[col] ?? row[col.trim()] ?? "") : ""; };
          const subCarrier = getVal("carrier_sub");
          return {
            ship_date: parseDate(getVal("ship_date")),
            tracking_no: String(getVal("tracking_no")).replace(/^'/, "").trim(),
            order_no: String(getVal("order_no")).replace(/^'|\\t/g, "").trim(),
            customer_name: String(getVal("customer_name")).trim(),
            recipient_name: String(getVal("recipient_name")).trim(),
            destination: String(getVal("destination")).trim().substring(0, 100),
            weight_kg: parseFloat(getVal("weight_kg")) || 0,
            cod_amount: parseFloat(getVal("cod_amount")) || 0,
            shipping_cost: parseFloat(getVal("shipping_cost")) || 0,
            sell_price: parseFloat(getVal("sell_price")) || 0,
            carrier_id: subCarrier ? (findCarrierId(subCarrier) || carrierId) : carrierId,
            status: "pending",
            source: importCarrier,
            created_by: auth?.user?.id,
          };
        }).filter(r => r.tracking_no && r.tracking_no !== "undefined" && r.tracking_no.length > 3);
        setImportPreview(mapped.slice(0, 15));
        setImportTotal(mapped.length);
        window._importData = mapped;
      } catch (err) { alert("อ่านไฟล์ไม่สำเร็จ: " + err.message); }
    };
    reader.readAsArrayBuffer(file);
  };

  const doImport = async () => {
    const data = window._importData;
    if (!data || data.length === 0) return;
    setImporting(true);
    let success = 0, errors = 0;
    const batchSize = 50;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize).map(r => ({
        ship_date: r.ship_date, tracking_no: r.tracking_no, order_no: r.order_no,
        recipient_name: r.recipient_name, destination: r.destination, weight_kg: r.weight_kg,
        cod_amount: r.cod_amount, shipping_cost: r.shipping_cost, sell_price: r.sell_price,
        carrier_id: r.carrier_id, status: r.status, source: r.source, created_by: r.created_by,
        customer_id: null,
      }));
      try {
        await supabase.from("orders").insert(batch);
        success += batch.length;
      } catch (e) {
        for (const row of batch) {
          try { await supabase.from("orders").insert(row); success++; } catch { errors++; }
        }
      }
    }
    setImportResult({ success, errors, total: data.length });
    setImporting(false);
    setImportPreview([]);
    window._importData = null;
    loadOrders();
  };

  // Export all matching orders
  const handleExport = async () => {
    if (!window.XLSX) return alert("กำลังโหลด Excel library...");
    setExporting(true);
    try {
      const session = JSON.parse(localStorage.getItem("wf_session") || "null");
      const token = session?.access_token;
      const allOrders = [];
      let offset = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        let url = `${SUPABASE_URL}/rest/v1/orders?select=*,carriers(name)`;
        if (search) url += `&or=(tracking_no.ilike.*${search}*,recipient_name.ilike.*${search}*,order_no.ilike.*${search}*)`;
        if (dateFilter) url += `&ship_date=gte.${dateFilter}`;
        if (dateEnd) url += `&ship_date=lte.${dateEnd}`;
        if (sourceFilter) url += `&source=eq.${sourceFilter}`;
        if (statusFilter) url += `&status=eq.${statusFilter}`;
        url += `&order=ship_date.desc&limit=${batchSize}&offset=${offset}`;

        const res = await fetch(url, { headers: supabaseHeaders(token) });
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) { hasMore = false; break; }
        allOrders.push(...data);
        if (data.length < batchSize) hasMore = false;
        else offset += batchSize;
        if (allOrders.length >= 10000) break;
      }

      const exportData = allOrders.map(o => ({
        "วันที่": o.ship_date, "Tracking": o.tracking_no, "Order No.": o.order_no,
        "ขนส่ง": o.carriers?.name || "", "ผู้รับ": o.recipient_name, "ปลายทาง": o.destination,
        "น้ำหนัก": o.weight_kg, "COD": o.cod_amount, "ต้นทุน": o.shipping_cost, "ราคาขาย": o.sell_price,
        "สถานะ": o.status, "แหล่ง": o.source,
      }));
      const ws = window.XLSX.utils.json_to_sheet(exportData);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, "Orders");
      window.XLSX.writeFile(wb, `orders_export_${new Date().toISOString().split("T")[0]}.xlsx`);
    } catch (e) {
      alert("Export ไม่สำเร็จ: " + e.message);
    }
    setExporting(false);
  };

  const statusBadge = (v) => {
    const m = { pending: "warning", processing: "info", delivered: "success", returned: "danger", disputed: "danger", cancelled: "default" };
    const labels = { pending: "รอดำเนินการ", processing: "กำลังจัดส่ง", delivered: "สำเร็จ", returned: "ตีกลับ", disputed: "แย้งบิล", cancelled: "ยกเลิก" };
    return <Badge type={m[v] || "default"}>{labels[v] || v}</Badge>;
  };

  // Page number buttons
  const pageButtons = () => {
    const btns = [];
    const maxShow = 7;
    let startP = Math.max(0, page - Math.floor(maxShow / 2));
    let endP = Math.min(totalPages - 1, startP + maxShow - 1);
    if (endP - startP < maxShow - 1) startP = Math.max(0, endP - maxShow + 1);
    for (let i = startP; i <= endP; i++) {
      btns.push(
        <button key={i} onClick={() => setPage(i)} style={{
          padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "none", cursor: "pointer",
          fontFamily: font, fontWeight: i === page ? 700 : 400,
          background: i === page ? colors.primary : colors.borderLight,
          color: i === page ? "#fff" : colors.text,
        }}>{i + 1}</button>
      );
    }
    return btns;
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3 }}>ออเดอร์ / นำเข้าข้อมูล</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { setShowImport(!showImport); setShowForm(false); }} style={{ ...css.btnPrimary, width: "auto", padding: "10px 20px", fontSize: 13, background: colors.accent }}>
            Import Excel
          </button>
          <button onClick={() => { setShowForm(!showForm); setShowImport(false); }} style={{ ...css.btnPrimary, width: "auto", padding: "10px 20px", fontSize: 13 }}>
            + เพิ่มรายการ
          </button>
        </div>
      </div>

      {/* IMPORT SECTION */}
      {showImport && (
        <div style={{ ...css.card, marginBottom: 20, borderLeft: `3px solid ${colors.accent}`, borderRadius: 0 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Import Excel — นำเข้าข้อมูลจากขนส่ง</h3>
          <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label style={css.label}>เลือกขนส่ง *</label>
              <select style={css.input} value={importCarrier} onChange={(e) => { setImportCarrier(e.target.value); setImportPreview([]); setImportResult(null); }}>
                <option value="">-- เลือก --</option>
                {Object.entries(CARRIER_MAPS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div style={{ flex: 2 }}>
              <label style={css.label}>เลือกไฟล์ Excel (.xlsx)</label>
              <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} disabled={!importCarrier || !xlsxLoaded}
                style={{ ...css.input, padding: "9px 12px" }} />
            </div>
          </div>
          {!xlsxLoaded && <div style={{ fontSize: 13, color: colors.warning, marginBottom: 8 }}>กำลังโหลด Excel reader...</div>}
          {importCarrier && (
            <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12, padding: "8px 12px", background: colors.bg, borderRadius: 8 }}>
              จะอ่านจาก Sheet: <strong>{CARRIER_MAPS[importCarrier].sheet}</strong> | Columns ที่ map: tracking, น้ำหนัก, COD, ราคาขาย, ต้นทุน
            </div>
          )}
          {importPreview.length > 0 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Preview ({importPreview.length} จาก {importTotal} รายการ)</div>
                <div style={{ display: "flex", gap: 12, fontSize: 13 }}>
                  <span>รวมยอดขาย: <strong style={{color:colors.primary}}>{"\u0E3F"}{importPreview.reduce((s,r) => s + (r.sell_price||0), 0).toLocaleString()}</strong></span>
                  <span>COD: <strong>{"\u0E3F"}{importPreview.reduce((s,r) => s + (r.cod_amount||0), 0).toLocaleString()}</strong></span>
                </div>
              </div>
              <div style={{ overflowX: "auto", maxHeight: 300, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ position: "sticky", top: 0, background: colors.card }}>
                      {["วันที่","Tracking","ลค.","ผู้รับ","น้ำหนัก","COD","ต้นทุน","ราคาขาย"].map(h =>
                        <th key={h} style={{ textAlign: "left", padding: "6px 8px", borderBottom: `1px solid ${colors.border}`, fontSize: 11, fontWeight: 600, color: colors.textMuted }}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.map((r, i) => (
                      <tr key={i}>
                        <td style={{ padding: "5px 8px", borderBottom: `1px solid ${colors.borderLight}` }}>{r.ship_date}</td>
                        <td style={{ padding: "5px 8px", borderBottom: `1px solid ${colors.borderLight}`, fontFamily: "monospace", fontSize: 11 }}>{r.tracking_no}</td>
                        <td style={{ padding: "5px 8px", borderBottom: `1px solid ${colors.borderLight}` }}>{r.customer_name?.substring(0,20)}</td>
                        <td style={{ padding: "5px 8px", borderBottom: `1px solid ${colors.borderLight}` }}>{r.recipient_name?.substring(0,15)}</td>
                        <td style={{ padding: "5px 8px", borderBottom: `1px solid ${colors.borderLight}` }}>{r.weight_kg}</td>
                        <td style={{ padding: "5px 8px", borderBottom: `1px solid ${colors.borderLight}` }}>{"\u0E3F"}{r.cod_amount.toLocaleString()}</td>
                        <td style={{ padding: "5px 8px", borderBottom: `1px solid ${colors.borderLight}` }}>{"\u0E3F"}{r.shipping_cost.toLocaleString()}</td>
                        <td style={{ padding: "5px 8px", borderBottom: `1px solid ${colors.borderLight}`, fontWeight: 600 }}>{"\u0E3F"}{r.sell_price.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button onClick={doImport} disabled={importing} style={{ ...css.btnPrimary, width: "auto", padding: "10px 24px", fontSize: 13, background: colors.accent, opacity: importing ? 0.6 : 1 }}>
                  {importing ? "กำลัง Import..." : `Import ${importTotal} รายการ`}
                </button>
                <button onClick={() => { setImportPreview([]); window._importData = null; }} style={{ ...css.btnPrimary, width: "auto", padding: "10px 24px", fontSize: 13, background: colors.border, color: colors.text }}>
                  ยกเลิก
                </button>
              </div>
            </div>
          )}
          {importResult && (
            <div style={{ marginTop: 12, padding: "12px 16px", borderRadius: 8, background: importResult.errors > 0 ? colors.warningLight : colors.primaryLight }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: importResult.errors > 0 ? colors.warning : colors.primary }}>
                Import เสร็จสิ้น: สำเร็จ {importResult.success} / {importResult.total} รายการ
                {importResult.errors > 0 && ` (error ${importResult.errors})`}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ADD FORM */}
      {showForm && (
        <div style={{ ...css.card, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>เพิ่มออเดอร์ใหม่ (กรอกเอง)</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={css.label}>ลูกค้า</label>
              <select style={css.input} value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
                <option value="">เลือกลูกค้า</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
            <div>
              <label style={css.label}>ขนส่ง *</label>
              <select style={css.input} value={form.carrier_id} onChange={(e) => setForm({ ...form, carrier_id: e.target.value })}>
                <option value="">เลือกขนส่ง</option>
                {carriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {[
              { key: "tracking_no", label: "Tracking No.", placeholder: "FL240418001" },
              { key: "order_no", label: "Order No.", placeholder: "ORD-001" },
              { key: "recipient_name", label: "ชื่อผู้รับ", placeholder: "ชื่อ" },
              { key: "destination", label: "ปลายทาง", placeholder: "จังหวัด" },
              { key: "weight_kg", label: "น้ำหนัก (kg)", placeholder: "0.5" },
              { key: "cod_amount", label: "COD", placeholder: "0" },
              { key: "shipping_cost", label: "ต้นทุนขนส่ง", placeholder: "0" },
              { key: "sell_price", label: "ราคาขาย", placeholder: "0" },
            ].map((f) => (
              <div key={f.key}>
                <label style={css.label}>{f.label}</label>
                <input style={css.input} placeholder={f.placeholder} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={handleAdd} style={{ ...css.btnPrimary, width: "auto", padding: "10px 24px", fontSize: 13 }}>บันทึก</button>
            <button onClick={() => setShowForm(false)} style={{ ...css.btnPrimary, width: "auto", padding: "10px 24px", fontSize: 13, background: colors.border, color: colors.text }}>ยกเลิก</button>
          </div>
        </div>
      )}

      {/* FILTERS & SEARCH */}
      <div style={{ ...css.card, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto auto", gap: 10, alignItems: "flex-end" }}>
          <div>
            <label style={css.label}>ค้นหา (Tracking / ชื่อ / Order No.)</label>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                style={{ ...css.input, padding: "8px 12px", fontSize: 13 }}
                placeholder="พิมพ์แล้วกด Enter..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") setSearch(searchInput); }}
              />
              <button onClick={() => setSearch(searchInput)} style={{ ...css.btnPrimary, width: "auto", padding: "8px 14px", fontSize: 12 }}>ค้นหา</button>
            </div>
          </div>
          <div>
            <label style={css.label}>วันที่เริ่ม</label>
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} style={{ ...css.input, padding: "8px 10px", fontSize: 12 }} />
          </div>
          <div>
            <label style={css.label}>วันที่สิ้นสุด</label>
            <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} style={{ ...css.input, padding: "8px 10px", fontSize: 12 }} />
          </div>
          <div>
            <label style={css.label}>แหล่ง</label>
            <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} style={{ ...css.input, padding: "8px 10px", fontSize: 12 }}>
              <option value="">ทั้งหมด</option>
              <option value="FLASH">Flash</option>
              <option value="DHL">DHL</option>
              <option value="WEFASTD">WefastD</option>
              <option value="WFG">WefastGO</option>
            </select>
          </div>
          <div>
            <label style={css.label}>สถานะ</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...css.input, padding: "8px 10px", fontSize: 12 }}>
              <option value="">ทั้งหมด</option>
              <option value="pending">รอดำเนินการ</option>
              <option value="processing">กำลังจัดส่ง</option>
              <option value="delivered">สำเร็จ</option>
              <option value="returned">ตีกลับ</option>
              <option value="cancelled">ยกเลิก</option>
            </select>
          </div>
          <div>
            <label style={css.label}>แสดง</label>
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} style={{ ...css.input, padding: "8px 10px", fontSize: 12, width: 80 }}>
              {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
            <button onClick={() => { setSearch(""); setSearchInput(""); setDateFilter(""); setDateEnd(""); setSourceFilter(""); setStatusFilter(""); setPage(0); }}
              style={{ padding: "8px 12px", fontSize: 12, borderRadius: 8, border: "none", cursor: "pointer", background: colors.borderLight, color: colors.text, fontFamily: font }}>
              ล้าง
            </button>
          </div>
        </div>
      </div>

      {/* ORDERS TABLE */}
      <div style={css.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            รายการออเดอร์ ({totalCount.toLocaleString()} รายการ)
            {search && <span style={{ fontWeight: 400, color: colors.textMuted }}> — ค้นหา "{search}"</span>}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={handleExport} disabled={exporting || totalCount === 0}
              style={{ ...css.btnPrimary, width: "auto", padding: "6px 14px", fontSize: 12, background: colors.primary, opacity: exporting ? 0.6 : 1 }}>
              {exporting ? "กำลัง Export..." : `Export Excel (${totalCount.toLocaleString()})`}
            </button>
            {totalCount > 0 && (
              <button onClick={async () => {
                if (!confirm(`ต้องการลบออเดอร์ทั้งหมด ${totalCount} รายการ? (ลบแล้วกู้คืนไม่ได้)`)) return;
                try {
                  // Delete visible page only for safety
                  for (const o of orders) { await supabase.from("orders").delete({ id: o.id }); }
                  loadOrders();
                } catch (e) { alert("ลบไม่สำเร็จ: " + e.message); }
              }} style={{ fontSize: 12, color: colors.danger, cursor: "pointer", background: "none", border: "none", fontFamily: font }}>
                ลบหน้านี้
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", color: colors.textMuted, padding: 24 }}>กำลังโหลด...</div>
        ) : (
          <DataTable
            columns={[
              { key: "ship_date", label: "วันที่" },
              { key: "tracking_no", label: "Tracking", render: (v) => <span style={{ fontFamily: "monospace", fontSize: 11 }}>{v || "-"}</span> },
              { key: "carriers", label: "ขนส่ง", render: (v) => v?.name || "-" },
              { key: "recipient_name", label: "ผู้รับ" },
              { key: "weight_kg", label: "น้ำหนัก" },
              { key: "cod_amount", label: "COD", render: (v) => `\u0E3F${parseFloat(v || 0).toLocaleString()}` },
              { key: "shipping_cost", label: "ต้นทุน", render: (v) => `\u0E3F${parseFloat(v || 0).toLocaleString()}` },
              { key: "sell_price", label: "ราคาขาย", render: (v) => `\u0E3F${parseFloat(v || 0).toLocaleString()}` },
              { key: "status", label: "สถานะ", render: statusBadge },
              { key: "source", label: "แหล่ง", render: (v) => v ? <Badge type="info">{v}</Badge> : "-" },
              { key: "id", label: "", render: (v) => (
                <span onClick={async (e) => {
                  e.stopPropagation();
                  if (!confirm("ลบรายการนี้?")) return;
                  await supabase.from("orders").delete({ id: v });
                  loadOrders();
                }} style={{ color: colors.danger, cursor: "pointer", fontSize: 12 }}>ลบ</span>
              )},
            ]}
            data={orders}
          />
        )}

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 12, borderTop: `1px solid ${colors.borderLight}`, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 12, color: colors.textMuted }}>
              แสดง {showFrom.toLocaleString()}–{showTo.toLocaleString()} จาก {totalCount.toLocaleString()} รายการ
            </div>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <button onClick={() => setPage(0)} disabled={page === 0}
                style={{ padding: "4px 8px", fontSize: 12, borderRadius: 6, border: "none", cursor: page === 0 ? "default" : "pointer", opacity: page === 0 ? 0.4 : 1, background: colors.borderLight, fontFamily: font }}>
                ≪
              </button>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "none", cursor: page === 0 ? "default" : "pointer", opacity: page === 0 ? 0.4 : 1, background: colors.borderLight, fontFamily: font }}>
                ← ก่อนหน้า
              </button>
              {pageButtons()}
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "none", cursor: page >= totalPages - 1 ? "default" : "pointer", opacity: page >= totalPages - 1 ? 0.4 : 1, background: colors.borderLight, fontFamily: font }}>
                ถัดไป →
              </button>
              <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}
                style={{ padding: "4px 8px", fontSize: 12, borderRadius: 6, border: "none", cursor: page >= totalPages - 1 ? "default" : "pointer", opacity: page >= totalPages - 1 ? 0.4 : 1, background: colors.borderLight, fontFamily: font }}>
                ≫
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// INVOICES PAGE
// ============================================================
function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await supabase.from("invoices").select("*,customers(company_name)", { order: "created_at.desc" });
      setInvoices(Array.isArray(data) ? data : []);
      setLoading(false);
    })();
  }, []);

  const statusBadge = (v) => {
    const m = { draft: "default", sent: "info", paid: "success", overdue: "danger", cancelled: "default" };
    const l = { draft: "ร่าง", sent: "ส่งแล้ว", paid: "ชำระแล้ว", overdue: "เกินกำหนด", cancelled: "ยกเลิก" };
    return <Badge type={m[v]}>{l[v] || v}</Badge>;
  };

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20, letterSpacing: -0.3 }}>การเงิน / บิล</h2>
      <div style={css.card}>
        {loading ? (
          <div style={{ textAlign: "center", color: colors.textMuted, padding: 24 }}>กำลังโหลด...</div>
        ) : (
          <DataTable
            columns={[
              { key: "invoice_no", label: "เลขบิล" },
              { key: "type", label: "ประเภท", render: (v) => <Badge type={v === "receivable" ? "success" : "warning"}>{v === "receivable" ? "รายรับ" : "รายจ่าย"}</Badge> },
              { key: "customers", label: "ลูกค้า", render: (v) => v?.company_name || "-" },
              { key: "total_amount", label: "จำนวนเงิน", render: (v) => `\u0E3F${parseFloat(v || 0).toLocaleString()}` },
              { key: "due_date", label: "ครบกำหนด" },
              { key: "status", label: "สถานะ", render: statusBadge },
            ]}
            data={invoices}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================
// EXPENSES PAGE (with add form + delete)
// ============================================================
function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: "other", vendor_name: "", description: "", amount: "", expense_date: new Date().toISOString().split("T")[0], due_date: "", notes: "" });
  const auth = useAuth();

  useEffect(() => { loadExpenses(); }, []);
  const loadExpenses = async () => {
    const data = await supabase.from("expenses").select("*", { order: "created_at.desc" });
    setExpenses(Array.isArray(data) ? data : []);
    setLoading(false);
  };
  const handleAdd = async () => {
    try {
      await supabase.from("expenses").insert({ ...form, amount: parseFloat(form.amount) || 0, status: "pending", created_by: auth?.user?.id });
      setShowForm(false);
      setForm({ category: "other", vendor_name: "", description: "", amount: "", expense_date: new Date().toISOString().split("T")[0], due_date: "", notes: "" });
      loadExpenses();
    } catch (e) { alert("เกิดข้อผิดพลาด: " + e.message); }
  };
  const catLabels = { shipping: "ค่าขนส่ง", rent: "ค่าเช่า", salary: "เงินเดือน", utilities: "สาธารณูปโภค", supplies: "วัสดุ", fuel: "น้ำมัน", insurance: "ประกัน", other: "อื่นๆ" };
  const catOptions = Object.entries(catLabels);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3 }}>ค่าใช้จ่าย</h2>
        <button onClick={() => setShowForm(!showForm)} style={{ ...css.btnPrimary, width: "auto", padding: "10px 20px", fontSize: 13 }}>+ เพิ่มค่าใช้จ่าย</button>
      </div>
      {showForm && (
        <div style={{ ...css.card, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>เพิ่มค่าใช้จ่าย</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={css.label}>ประเภท *</label>
              <select style={css.input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {catOptions.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select></div>
            <div><label style={css.label}>ผู้ขาย/บริษัท</label><input style={css.input} placeholder="ชื่อผู้ขาย" value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })} /></div>
            <div><label style={css.label}>รายละเอียด</label><input style={css.input} placeholder="รายละเอียดค่าใช้จ่าย" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><label style={css.label}>จำนวนเงิน (บาท) *</label><input style={css.input} type="number" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div><label style={css.label}>วันที่</label><input style={css.input} type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} /></div>
            <div><label style={css.label}>ครบกำหนดชำระ</label><input style={css.input} type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            <div style={{ gridColumn: "1 / -1" }}><label style={css.label}>หมายเหตุ</label><input style={css.input} placeholder="หมายเหตุเพิ่มเติม" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={handleAdd} style={{ ...css.btnPrimary, width: "auto", padding: "10px 24px", fontSize: 13 }}>บันทึก</button>
            <button onClick={() => setShowForm(false)} style={{ ...css.btnPrimary, width: "auto", padding: "10px 24px", fontSize: 13, background: colors.border, color: colors.text }}>ยกเลิก</button>
          </div>
        </div>
      )}
      <div style={css.card}>
        {loading ? <div style={{ textAlign: "center", color: colors.textMuted, padding: 24 }}>กำลังโหลด...</div> : (
          <DataTable columns={[
            { key: "expense_date", label: "วันที่" },
            { key: "category", label: "ประเภท", render: (v) => catLabels[v] || v },
            { key: "vendor_name", label: "ผู้ขาย" },
            { key: "description", label: "รายละเอียด" },
            { key: "amount", label: "จำนวนเงิน", render: (v) => `\u0E3F${parseFloat(v || 0).toLocaleString()}` },
            { key: "due_date", label: "ครบกำหนด", render: (v) => v || "-" },
            { key: "status", label: "สถานะ", render: (v) => <Badge type={v === "paid" ? "success" : v === "approved" ? "info" : "warning"}>{v === "paid" ? "จ่ายแล้ว" : v === "approved" ? "อนุมัติ" : "รอ"}</Badge> },
            { key: "id", label: "", render: (v) => <span onClick={async (e) => { e.stopPropagation(); if(!confirm("ลบรายการนี้?")) return; await supabase.from("expenses").delete({id:v}); loadExpenses(); }} style={{color:colors.danger,cursor:"pointer",fontSize:12}}>ลบ</span> },
          ]} data={expenses} />
        )}
      </div>
    </div>
  );
}

// ============================================================
// CASES PAGE (with add form + delete)
// ============================================================
function CasesPage() {
  const [cases, setCases] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customer_id: "", subject: "", description: "", priority: "medium", category: "" });
  const auth = useAuth();

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    const [c, cus] = await Promise.all([
      supabase.from("support_cases").select("*,customers(company_name)", { order: "created_at.desc" }),
      supabase.from("customers").select("id,company_name"),
    ]);
    setCases(Array.isArray(c) ? c : []);
    setCustomers(Array.isArray(cus) ? cus : []);
    setLoading(false);
  };
  const handleAdd = async () => {
    try {
      const caseNo = "CS-" + String(Date.now()).slice(-6);
      await supabase.from("support_cases").insert({ ...form, case_no: caseNo, status: "open", created_by: auth?.user?.id, customer_id: form.customer_id || null });
      setShowForm(false);
      setForm({ customer_id: "", subject: "", description: "", priority: "medium", category: "" });
      loadData();
    } catch (e) { alert("เกิดข้อผิดพลาด: " + e.message); }
  };
  const priLabels = { low: "ต่ำ", medium: "ปานกลาง", high: "สูง", urgent: "ด่วนมาก" };
  const statusLabels = { open: "เปิด", in_progress: "กำลังดำเนินการ", waiting: "รอ", resolved: "แก้ไขแล้ว", closed: "ปิด" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3 }}>เคส CS / Support</h2>
        <button onClick={() => setShowForm(!showForm)} style={{ ...css.btnPrimary, width: "auto", padding: "10px 20px", fontSize: 13 }}>+ เปิดเคสใหม่</button>
      </div>
      {showForm && (
        <div style={{ ...css.card, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>เปิดเคสใหม่</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={css.label}>ลูกค้า</label>
              <select style={css.input} value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
                <option value="">เลือกลูกค้า (ถ้ามี)</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select></div>
            <div><label style={css.label}>ความสำคัญ</label>
              <select style={css.input} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {Object.entries(priLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select></div>
            <div><label style={css.label}>หัวข้อปัญหา *</label><input style={css.input} placeholder="เช่น พัสดุเสียหาย, COD ไม่ตรง" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
            <div><label style={css.label}>ประเภท</label>
              <select style={css.input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="">เลือกประเภท</option>
                <option value="damaged">พัสดุเสียหาย</option>
                <option value="lost">พัสดุสูญหาย</option>
                <option value="wrong_address">ส่งผิดที่อยู่</option>
                <option value="cod_mismatch">COD ไม่ตรง</option>
                <option value="delay">ส่งล่าช้า</option>
                <option value="return">ตีกลับ</option>
                <option value="billing">แย้งบิล</option>
                <option value="other">อื่นๆ</option>
              </select></div>
            <div style={{ gridColumn: "1 / -1" }}><label style={css.label}>รายละเอียด</label><input style={css.input} placeholder="อธิบายปัญหา..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={handleAdd} style={{ ...css.btnPrimary, width: "auto", padding: "10px 24px", fontSize: 13 }}>บันทึก</button>
            <button onClick={() => setShowForm(false)} style={{ ...css.btnPrimary, width: "auto", padding: "10px 24px", fontSize: 13, background: colors.border, color: colors.text }}>ยกเลิก</button>
          </div>
        </div>
      )}
      <div style={css.card}>
        {loading ? <div style={{ textAlign: "center", color: colors.textMuted, padding: 24 }}>กำลังโหลด...</div> : (
          <DataTable columns={[
            { key: "case_no", label: "เคส" },
            { key: "customers", label: "ลูกค้า", render: (v) => v?.company_name || "-" },
            { key: "subject", label: "หัวข้อ" },
            { key: "category", label: "ประเภท" },
            { key: "priority", label: "ความสำคัญ", render: (v) => <Badge type={v === "urgent" ? "danger" : v === "high" ? "warning" : "default"}>{priLabels[v] || v}</Badge> },
            { key: "status", label: "สถานะ", render: (v) => <Badge type={v === "resolved" || v === "closed" ? "success" : v === "open" ? "danger" : "warning"}>{statusLabels[v] || v}</Badge> },
            { key: "id", label: "", render: (v) => <span onClick={async (e) => { e.stopPropagation(); if(!confirm("ลบเคสนี้?")) return; await supabase.from("support_cases").delete({id:v}); loadData(); }} style={{color:colors.danger,cursor:"pointer",fontSize:12}}>ลบ</span> },
          ]} data={cases} />
        )}
      </div>
    </div>
  );
}

// ============================================================
// CARRIERS PAGE
// ============================================================
function CarriersPage() {
  const [carriers, setCarriers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await supabase.from("carriers").select("*");
      setCarriers(Array.isArray(data) ? data : []);
      setLoading(false);
    })();
  }, []);

  const cycleLabels = { weekly: "รายสัปดาห์", biweekly: "ทุก 2 สัปดาห์", monthly: "รายเดือน" };

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20, letterSpacing: -0.3 }}>ขนส่ง</h2>
      <div style={css.card}>
        {loading ? (
          <div style={{ textAlign: "center", color: colors.textMuted, padding: 24 }}>กำลังโหลด...</div>
        ) : (
          <DataTable
            columns={[
              { key: "name", label: "ชื่อขนส่ง" },
              { key: "code", label: "รหัส" },
              { key: "billing_cycle", label: "รอบวางบิล", render: (v) => cycleLabels[v] || v },
              { key: "is_active", label: "สถานะ", render: (v) => <Badge type={v ? "success" : "default"}>{v ? "ใช้งาน" : "ปิด"}</Badge> },
            ]}
            data={carriers}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================
// ACTIVITY LOG PAGE
// ============================================================
function ActivityPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await supabase.from("activity_log").select("*", { order: "created_at.desc", limit: 50 });
      setLogs(Array.isArray(data) ? data : []);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20, letterSpacing: -0.3 }}>Activity Log</h2>
      <div style={css.card}>
        {loading ? (
          <div style={{ textAlign: "center", color: colors.textMuted, padding: 24 }}>กำลังโหลด...</div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: "center", color: colors.textLight, padding: 24, fontSize: 13 }}>ยังไม่มีกิจกรรม — เมื่อพนักงานเริ่มใช้ระบบ log จะแสดงที่นี่</div>
        ) : (
          <DataTable
            columns={[
              { key: "created_at", label: "เวลา", render: (v) => new Date(v).toLocaleString("th-TH") },
              { key: "action", label: "การกระทำ" },
              { key: "target_table", label: "ตาราง" },
              { key: "description", label: "รายละเอียด" },
            ]}
            data={logs}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================
// LEADS PAGE (Sales)
// ============================================================
function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await supabase.from("leads").select("*", { order: "created_at.desc" });
      setLeads(Array.isArray(data) ? data : []);
      setLoading(false);
    })();
  }, []);

  const statusLabels = { prospect: "เป้าหมาย", contacted: "ติดต่อแล้ว", proposal_sent: "ส่ง Proposal", negotiating: "เจรจา", won: "ปิดได้", lost: "ไม่สำเร็จ" };

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20, letterSpacing: -0.3 }}>Pipeline ฝ่ายขาย</h2>
      <div style={css.card}>
        {loading ? (
          <div style={{ textAlign: "center", color: colors.textMuted, padding: 24 }}>กำลังโหลด...</div>
        ) : (
          <DataTable
            columns={[
              { key: "company_name", label: "บริษัท" },
              { key: "contact_name", label: "ผู้ติดต่อ" },
              { key: "phone", label: "เบอร์โทร" },
              { key: "estimated_monthly_volume", label: "ยอดคาดการณ์/เดือน", render: (v) => v ? `\u0E3F${parseFloat(v).toLocaleString()}` : "-" },
              { key: "status", label: "สถานะ", render: (v) => <Badge type={v === "won" ? "success" : v === "lost" ? "danger" : "info"}>{statusLabels[v] || v}</Badge> },
            ]}
            data={leads}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = supabase.auth.getSession();
    if (saved?.access_token) {
      setSession(saved);
      loadUser(saved);
    } else {
      setReady(true);
    }
  }, []);

  const loadUser = async (s) => {
    try {
      const data = await supabase.from("users").select("*", { id: `eq.${s.user.id}` });
      if (Array.isArray(data) && data.length > 0) {
        setUser(data[0]);
      } else {
        setUser({ id: s.user.id, email: s.user.email, name: s.user.email.split("@")[0], role: "manager" });
      }
    } catch {
      setUser({ id: s.user.id, email: s.user.email, name: s.user.email.split("@")[0], role: "manager" });
    }
    setReady(true);
  };

  const handleLogin = (data) => {
    setSession(data);
    loadUser(data);
  };

  const handleLogout = () => {
    supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setPage("dashboard");
  };

  if (!ready) {
    return (
      <div style={{ ...css.app, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Noto+Sans+Thai:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <div style={{ color: colors.textMuted, fontSize: 15 }}>กำลังโหลด WhaleFast CRM...</div>
      </div>
    );
  }

  if (!session) return <LoginPage onLogin={handleLogin} />;

  const pages = {
    dashboard: DashboardPage,
    customers: CustomersPage,
    orders: OrdersPage,
    invoices: InvoicesPage,
    expenses: ExpensesPage,
    cases: CasesPage,
    carriers: CarriersPage,
    activity: ActivityPage,
    leads: LeadsPage,
  };

  const PageComponent = pages[page] || DashboardPage;

  return (
    <AuthContext.Provider value={{ session, user }}>
      <div style={css.app}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Noto+Sans+Thai:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <Sidebar user={user} currentPage={page} onNavigate={setPage} onLogout={handleLogout} />
        <div style={css.main}>
          <PageComponent />
        </div>
      </div>
    </AuthContext.Provider>
  );
}
