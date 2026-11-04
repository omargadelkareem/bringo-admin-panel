import { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";
import { onValue, ref, runTransaction } from "firebase/database";
import { getAuth } from "firebase/auth";

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
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [previewReceipt, setPreviewReceipt] = useState(null);
  const admin = getAuth().currentUser;
  const review = async (item, decision) => {
    if (busyId) return;
    if (!admin) { setError("أزرار المراجعة ظاهرة، لكن اعتماد الرصيد يتطلب صلاحية إدارة موثوقة. لا يمكن إضافة رصيد بأمان من جلسة غير موثقة."); return; }
    const token = await admin.getIdTokenResult();
    if (token.claims.admin !== true) {setError("الحساب غير مصرح له بالموافقة المالية");return;}
    const raw = decision==="approved" ? window.prompt("المبلغ المعتمد بالجنيه",String(Number(item.amountCents||0)/100)) : "0";
    if (raw===null) return;
    const amount=Number(raw), cents=Math.round(amount*100);
    if (decision==="approved" && (!Number.isFinite(amount)||amount<1||Math.abs(amount*100-cents)>0.001)) {setError("مبلغ غير صحيح");return;}
    if (!window.confirm("تأكيد "+(decision==="approved"?"إضافة "+amount+" جنيه":"رفض الطلب")+"؟")) return;
    setBusyId(item.firebaseKey);setError("");
    try {
      const result=await runTransaction(ref(db),data=>{
        if (!data || !data.walletTopUpRequests?.[item.firebaseKey]) return;
        const request=data.walletTopUpRequests[item.firebaseKey];
        if (request.status!=="pending" || !data.drivers?.[request.driverId]) return;
        const id=request.driverId;
        data.driverWallets ||= {};
        const wallet=data.driverWallets[id] ||= {balanceCents:0,activated:false};
        const balance=Number(wallet.balanceCents||0);
        if (!Number.isSafeInteger(balance) || !Number.isSafeInteger(balance+cents)) return;
        if (decision==="approved") {
          wallet.balanceCents=balance+cents;wallet.activated=true;wallet.updatedAt=Date.now();
          data.driverWalletLedger ||= {};
          data.driverWalletLedger[id] ||= {};
          data.driverWalletLedger[id]["topup_"+item.firebaseKey]={
            type:"topup",amountCents:cents,balanceAfterCents:wallet.balanceCents,
            requestId:item.firebaseKey,approvedBy:admin.uid,createdAt:Date.now()
          };
        }
        request.status=decision;request.approvedAmountCents=decision==="approved"?cents:0;
        request.reviewedAt=Date.now();request.reviewedBy=admin.uid;
        return data;
      },{applyLocally:false});
      if (!result.committed) throw Error("الطلب تمت مراجعته أو البيانات غير صحيحة");
    } catch(e) {setError("فشل الاعتماد: "+(e.message||"راجع الصلاحيات"));}
    finally {setBusyId(null);}
  };

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

    <div style={{display:"flex",justifyContent:"space-between",margin:"12px 0"}}>
      <span>عرض الطلبات متاح مباشرة. اعتماد الرصيد يحتاج صلاحيات إدارة مالية آمنة في Firebase.</span>

    </div>
    {error&&<p role="alert" style={{color:"#a33",padding:12}}>{error}</p>}
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
          {["الطيار","المبلغ","رقم التحويل منه","رقم العملية","الإيصال","التاريخ","الحالة","الإجراء"].map(h=><th key={h} style={{padding:14,borderBottom:"1px solid #e1e9e3"}}>{h}</th>)}
        </tr></thead>
        <tbody>{filtered.map(r=><tr key={r.firebaseKey}>
          <td style={{padding:14,borderBottom:"1px solid #edf0ed"}}><strong>{r.driverName || "طيار"}</strong><div>{r.driverPhone || "-"}</div></td>
          <td style={{padding:14,borderBottom:"1px solid #edf0ed",fontWeight:700}}>{money(r.amountCents)}</td>
          <td style={{padding:14,borderBottom:"1px solid #edf0ed"}} dir="ltr">{r.senderPhone || "-"}</td>
          <td style={{padding:14,borderBottom:"1px solid #edf0ed"}} dir="ltr">{r.transferReference || "-"}</td>
          <td style={{padding:12,borderBottom:"1px solid #edf0ed"}}>
            {r.receiptImageBase64 ? <button type="button" onClick={()=>setPreviewReceipt("data:image/jpeg;base64,"+r.receiptImageBase64)} title="تكبير الإيصال داخل الصفحة" style={{border:"none",background:"transparent",cursor:"zoom-in",padding:0}}>
              <img src={"data:image/jpeg;base64,"+r.receiptImageBase64} alt={"إيصال تحويل "+(r.driverName||"الطيار")} style={{width:160,height:130,objectFit:"contain",borderRadius:10,border:"1px solid #dce5df",background:"#f8faf9"}}/>
            </button> : <span>لم يرفق إيصال</span>}
          </td>
          <td style={{padding:14,borderBottom:"1px solid #edf0ed"}}>{datetime(r.createdAt)}</td>
          <td style={{padding:14,borderBottom:"1px solid #edf0ed"}}>
            <span style={{color:pillColors[r.status]||pillColors.pending,fontWeight:700}}>
              {r.status==="rejected"?<XCircle size={13} style={{verticalAlign:"middle"}}/>:null}
              {" "}{statusLabels[r.status]||statusLabels.pending}
            </span>
          </td>
          <td style={{padding:12,borderBottom:"1px solid #edf0ed"}}>
            {r.status==="pending" ? <div style={{display:"flex",gap:6}}>
              <button type="button" disabled={Boolean(busyId)} onClick={()=>review(r,"approved")} style={{background:"#176d4d",color:"white",padding:"8px 12px",borderRadius:8}}>موافقة</button>
              <button type="button" disabled={Boolean(busyId)} onClick={()=>review(r,"rejected")} style={{background:"#fff0f0",color:"#a33838",padding:"8px 12px",borderRadius:8}}>رفض</button>
            </div> : "تمت المراجعة"}
          </td>
        </tr>)}</tbody>
      </table>
      {!filtered.length&&<p style={{padding:22,textAlign:"center",color:"#65756f"}}>لا توجد طلبات مطابقة.</p>}
    </div>
    {previewReceipt && <div role="dialog" aria-modal="true" aria-label="معاينة إيصال التحويل" onClick={()=>setPreviewReceipt(null)} style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,.78)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,cursor:"zoom-out"}}>
      <button type="button" onClick={()=>setPreviewReceipt(null)} aria-label="إغلاق الصورة" style={{position:"absolute",top:18,left:20,border:0,borderRadius:8,padding:"10px 16px",cursor:"pointer"}}>إغلاق ×</button>
      <img src={previewReceipt} alt="صورة إيصال التحويل بالحجم الكبير" onClick={e=>e.stopPropagation()} style={{maxWidth:"95vw",maxHeight:"88vh",objectFit:"contain",borderRadius:12,cursor:"default"}}/>
    </div>}
  </div>;
}
