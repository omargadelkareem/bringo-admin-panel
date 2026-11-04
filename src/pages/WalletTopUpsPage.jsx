import { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";
import { onValue, ref } from "firebase/database";
import { CheckCircle2, Clock3, ShieldAlert, WalletCards, XCircle } from "lucide-react";
import "../admin-v2.css";

const money = cents => ((Number(cents) || 0) / 100).toFixed(2) + " ج";
const datetime = value => value ? new Date(Number(value)).toLocaleString("ar-EG") : "-";
const statusLabels = { pending: "بانتظار المراجعة", approved: "تم الاعتماد", rejected: "مرفوض" };
const pillColors = { pending: "#A36905", approved: "#176D4D", rejected: "#A33838" };

export default function WalletTopUpsPage() {
  const [requests, setRequests] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("pending");

  useEffect(() => onValue(ref(db, "walletTopUpRequests"), snap => {
    const data = snap.val() || {};
    setRequests(Object.entries(data).filter(([,v]) => v && typeof v === "object")
      .map(([key,v]) => ({ ...v, firebaseKey:key }))
      .sort((a,b) => Number(b.createdAt || 0)-Number(a.createdAt || 0)));
  }), []);

  const filtered = useMemo(() => requests.filter(r => {
    const matchesStatus = status === "all" || (r.status || "pending") === status;
    const term = query.trim().toLowerCase();
    return matchesStatus && (!term || [
      r.driverName, r.driverPhone, r.senderPhone, r.transferReference, r.id
    ].some(x => String(x || "").toLowerCase().includes(term)));
  }), [requests,query,status]);

  const pending = requests.filter(r => (r.status || "pending") === "pending").length;

  return <div className="catalog-page" dir="rtl" style={{maxWidth:1100}}>
    <div className="catalog-heading"><div>
      <span>DRIVER WALLET OPERATIONS</span>
      <h1>طلبات شحن المحافظ</h1>
      <p>راجع تحويلات الكباتن وقارنها بكشف محفظة Bringo قبل أي اعتماد مالي.</p>
    </div></div>

    <div className="ops-metrics">
      <div><Clock3 size={22}/><strong>{pending}</strong><span>قيد المراجعة</span></div>
      <div><WalletCards size={22}/><strong>{requests.length}</strong><span>إجمالي الطلبات</span></div>
      <div><CheckCircle2 size={22}/><strong>{requests.filter(r=>r.status==="approved").length}</strong><span>تم اعتمادها</span></div>
    </div>

    <div style={{border:"1px solid #ead5a5",background:"#fffaf0",borderRadius:10,padding:16,margin:"18px 0",display:"flex",alignItems:"flex-start",gap:10}}>
      <ShieldAlert size={20} color="#945f06"/>
      <div><strong style={{display:"block",marginBottom:4}}>الاعتماد المالي غير مفعّل حتى إعداد المصادقة والصلاحيات الآمنة</strong>
        <span style={{fontSize:13}}>طلبات الشحن متاحة للمراجعة، لكن لا يمكن اعتمادها من المتصفح مباشرة لأن نظام الدخول الحالي لا يثبت هوية المسؤول بصلاحيات Firebase Auth. يلزم تنفيذ اعتماد ذري من خادم موثوق قبل تفعيل أزرار الموافقة والرفض.</span></div>
    </div>

    <div className="product-toolbar" style={{display:"flex",gap:10,flexWrap:"wrap"}}>
      <div className="product-search" style={{flex:"1 1 260px"}}>
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="اسم الكابتن، الهاتف أو رقم العملية..."/>
      </div>
      <select value={status} onChange={e=>setStatus(e.target.value)} style={{padding:"10px 14px",border:"1px solid #dce5df",borderRadius:8}}>
        <option value="pending">بانتظار المراجعة</option>
        <option value="approved">تم الاعتماد</option>
        <option value="rejected">مرفوض</option>
        <option value="all">كل الطلبات</option>
      </select>
    </div>

    <div style={{overflowX:"auto",background:"white",border:"1px solid #e1e9e3",borderRadius:10}}>
      <table style={{width:"100%",borderCollapse:"collapse",minWidth:760,fontSize:13}}>
        <thead><tr style={{background:"#f7faf8",textAlign:"right"}}>
          {["الطيار","المبلغ","رقم التحويل منه","رقم العملية","التاريخ","الحالة"].map(h=><th key={h} style={{padding:14,borderBottom:"1px solid #e1e9e3"}}>{h}</th>)}
        </tr></thead>
        <tbody>{filtered.map(r=><tr key={r.firebaseKey}>
          <td style={{padding:14,borderBottom:"1px solid #edf0ed"}}><strong>{r.driverName || "طيار"}</strong><div>{r.driverPhone || "-"}</div></td>
          <td style={{padding:14,borderBottom:"1px solid #edf0ed",fontWeight:700}}>{money(r.amountCents)}</td>
          <td style={{padding:14,borderBottom:"1px solid #edf0ed"}} dir="ltr">{r.senderPhone || "-"}</td>
          <td style={{padding:14,borderBottom:"1px solid #edf0ed"}} dir="ltr">{r.transferReference || "-"}</td>
          <td style={{padding:14,borderBottom:"1px solid #edf0ed"}}>{datetime(r.createdAt)}</td>
          <td style={{padding:14,borderBottom:"1px solid #edf0ed"}}>
            <span style={{color:pillColors[r.status]||pillColors.pending,fontWeight:700}}>
              {r.status==="rejected"?<XCircle size={13} style={{verticalAlign:"middle"}}/>:null}
              {" "}{statusLabels[r.status]||statusLabels.pending}
            </span>
          </td>
        </tr>)}</tbody>
      </table>
      {!filtered.length&&<p style={{padding:22,textAlign:"center",color:"#65756f"}}>لا توجد طلبات مطابقة.</p>}
    </div>
  </div>;
}
