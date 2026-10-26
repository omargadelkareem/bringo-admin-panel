import { useMemo, useState } from "react";
import { AlertTriangle, BellRing, CheckCircle2, Send, Smartphone, UserRound, UsersRound, XCircle } from "lucide-react";

const API_BASE = import.meta.env.VITE_NOTIFICATION_API_URL || "http://localhost:3001";
const API_KEY = import.meta.env.VITE_BRINGO_ADMIN_API_KEY || "bringo-local-admin";

export default function NotificationsPage() {
  const [audience, setAudience] = useState("all");
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const canSend = useMemo(() => {
    const recipientReady = audience === "all" || userId.trim();
    return recipientReady && title.trim() && body.trim() && !sending;
  }, [audience, userId, title, body, sending]);

  async function sendNotification(event) {
    event.preventDefault();
    if (!canSend) return;
    if (audience === "all" && !window.confirm("إرسال الإشعار إلى كل العملاء المسجلين؟")) return;
    setSending(true); setResult(null);
    try {
      const isBroadcast = audience === "all";
      const endpoint = isBroadcast ? "/api/send-notification-all" : "/api/send-notification";
      const requestBody = { title: title.trim(), body: body.trim(), data: { source: "admin" } };
      if (!isBroadcast) requestBody.userId = userId.trim();
      const response = await fetch(`${API_BASE}${endpoint}`, { method:"POST", headers:{"Content-Type":"application/json",Authorization:`Bearer ${API_KEY}`}, body:JSON.stringify(requestBody) });
      const payload = await response.json().catch(()=>({}));
      if (!response.ok) throw new Error(payload.error || `فشل إرسال الإشعار (${response.status})`);
      const successCount=Number(payload.successCount||0), failureCount=Number(payload.failureCount||0), deviceCount=Number(payload.deviceCount??(successCount+failureCount)), errors=Array.isArray(payload.errors)?payload.errors:[];
      setResult({type:payload.ok&&successCount>0?"success":"error",isBroadcast,successCount,failureCount,deviceCount,usersWithTokens:Number(payload.usersWithTokens||0),registeredCustomers:Number(payload.registeredCustomers||0),notificationId:payload.notificationId||"",errors});
      if(payload.ok&&successCount>0){setTitle("");setBody("");}
    } catch(error) { setResult({type:"error",message:error?.message||"فشل إرسال الإشعار"}); }
    finally { setSending(false); }
  }

  return <div dir="rtl" style={{maxWidth:850,margin:"0 auto",padding:"28px"}}>
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}><BellRing/><div><h1 style={{margin:0}}>الإشعارات</h1><p style={{margin:"5px 0",color:"#66736f"}}>إرسال إشعارات Push لعملاء Bringo.</p></div></div>
    <form onSubmit={sendNotification} style={{background:"#fff",padding:24,borderRadius:18,border:"1px solid #e5e9e7",display:"grid",gap:18}}>
      <div style={{display:"flex",gap:10}}><button type="button" onClick={()=>setAudience("all")} style={{padding:12,borderRadius:10,border:"1px solid #ddd",fontWeight:800,background:audience==="all"?"#eaf7f1":"#fff"}}><UsersRound size={17}/> كل العملاء</button><button type="button" onClick={()=>setAudience("user")} style={{padding:12,borderRadius:10,border:"1px solid #ddd",fontWeight:800,background:audience==="user"?"#eaf7f1":"#fff"}}><UserRound size={17}/> عميل محدد</button></div>
      {audience==="user"&&<label>معرف العميل<input value={userId} onChange={e=>setUserId(e.target.value)} style={{display:"block",width:"100%",padding:12,marginTop:7}}/></label>}
      <label>عنوان الإشعار<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={80} style={{display:"block",width:"100%",padding:12,marginTop:7}}/></label>
      <label>نص الإشعار<textarea value={body} onChange={e=>setBody(e.target.value)} rows={5} maxLength={300} style={{display:"block",width:"100%",padding:12,marginTop:7,resize:"vertical"}}/></label>
      <button disabled={!canSend} style={{padding:14,border:0,borderRadius:11,background:"#167a55",color:"white",fontWeight:900,opacity:canSend?1:.5}}><Send size={17}/> {sending?"جاري الإرسال...":"إرسال الإشعار"}</button>
      {result?.type==="success"&&<div style={{padding:14,background:"#eaf8f1",color:"#176443",borderRadius:10}}><CheckCircle2 size={18}/> تم الإرسال إلى {result.successCount} جهاز. {result.failureCount>0&&`فشل ${result.failureCount}.`}</div>}
      {result?.type==="error"&&<div style={{padding:14,background:"#fff1f0",color:"#b42318",borderRadius:10}}><XCircle size={18}/> {result.message||"لم يتم إرسال الإشعار."}</div>}
      <small style={{color:"#7a8581"}}><Smartphone size={14}/> يجب أن يكون تطبيق العميل مسجلاً FCM token.</small>
    </form>
  </div>;
}
