import { useEffect, useMemo, useState } from "react";
import { onValue, ref } from "firebase/database";
import { useNavigate } from "react-router-dom";
import { Bell, Package, Search } from "lucide-react";
import { db } from "../firebase";
import "../admin-v2.css";

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const unsubscribe = onValue(ref(db, "orders"), snapshot => {
      setError("");
      setOrders(Object.entries(snapshot.val() || {}).map(([id, value]) => ({ id, ...(value || {}) }))
        .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)));
    }, () => setError("تعذر تحميل الإشعارات. تحقق من الاتصال وصلاحيات Firebase."));
    return unsubscribe;
  }, []);
  const filtered = useMemo(() => orders.filter(o =>
    [o.id, o.customerName, o.storeName, o.orderStatus, o.status].some(v =>
      String(v || "").toLowerCase().includes(query.trim().toLowerCase()))), [orders, query]);
  return <section dir="rtl" style={{ padding: "24px", maxWidth: 1050, margin: "0 auto" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
      <Bell size={27} /><div><h2 style={{ margin: 0 }}>الإشعارات</h2>
      <p style={{ margin: "6px 0", color: "#687b75" }}>متابعة الطلبات الواردة للمنصة لحظيًا</p></div>
    </div>
    <div style={{ position: "relative", marginBottom: 18 }}>
      <Search size={18} style={{ position: "absolute", right: 14, top: 14, color: "#70847d" }}/>
      <input aria-label="البحث في الإشعارات" value={query} onChange={e => setQuery(e.target.value)}
        placeholder="ابحث برقم الطلب أو اسم العميل أو المتجر"
        style={{ width: "100%", padding: "13px 44px 13px 15px", border: "1px solid #dfe8e4", borderRadius: 12, boxSizing: "border-box" }}/>
    </div>
    {error && <p role="alert">{error}</p>}
    {!error && !filtered.length && <p style={{ color: "#71847d" }}>لا توجد إشعارات للعرض حاليًا</p>}
    <div style={{ display: "grid", gap: 10 }}>
      {filtered.map(o => <button key={o.id} type="button" onClick={() => navigate("/orders")}
        style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: 18,
          background: "#fff", border: "1px solid #e1e9e5", borderRadius: 14,
          cursor: "pointer", textAlign: "right", color: "#203c34" }}>
        <Package size={21}/><div style={{ flex: 1 }}>
          <strong>طلب #{String(o.id).slice(-8)}</strong>
          <div style={{ marginTop: 5, color: "#657a72", fontSize: 13 }}>
            {o.customerName || o.storeName || "طلب Bringo"} · {o.orderStatus || o.status || "جديد"}
          </div>
        </div>
        <span style={{ fontSize: 12, color: "#778981" }}>
          {o.createdAt && Number.isFinite(Number(o.createdAt))
            ? new Date(Number(o.createdAt)).toLocaleString("ar-EG") : ""}
        </span>
      </button>)}
    </div>
  </section>;
}
