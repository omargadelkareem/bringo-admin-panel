import { useMemo, useState } from "react";
import { AlertTriangle, BellRing, CheckCircle2, Send, Smartphone, UserRound, UsersRound, XCircle } from "lucide-react";

const API_BASE = import.meta.env.VITE_NOTIFICATION_API_URL || "";
const API_KEY = import.meta.env.VITE_BRINGO_ADMIN_API_KEY || "bringo-local-admin";

export default function NotificationsPage() {
  const [audience, setAudience] = useState("all");
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const canSend = useMemo(() => (audience === "all" || userId.trim()) && title.trim() && body.trim() && !sending,[audience,userId,title,body,sending]);

  async function sendNotification(event) {
    event.preventDefault();
    if (!canSend) return;
    if (audience === "all" && !window.confirm("إرسال الإشعار إلى كل العملاء المسجلين؟")) return;
    setSending(true); setResult(null);
    try {
      const isBroadcast = audience === "all";
      const requestBody = { title:title.trim(), body:body.trim(), data:{source:"admin"} };
      if (!isBroadcast) requestBody.userId = userId.trim();
      const response = await fetch(`${API_BASE}${isBroadcast?"/api/send-notification-all":"/api/send-notification"}`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${API_KEY}`},body:JSON.stringify(requestBody)});
      const payload = await response.json().catch(()=>({}));
      if (!response.ok) throw new Error(payload.error || "فشل إرسال الإشعار");
      const successCount=Number(payload.successCount||0), failureCount=Number(payload.failureCount||0);
      setResult({type:payload.ok&&successCount>0?"success":"error",successCount,failureCount,deviceCount:Number(payload.deviceCount??successCount+failureCount),usersWithTokens:Number(payload.usersWithTokens||0),registeredCustomers:Number(payload.registeredCustomers||0),notificationId:payload.notificationId||"",errors:Array.isArray(payload.errors)?payload.errors:[]});
      if(payload.ok&&successCount>0){setTitle("");setBody("");}
    } catch(error){setResult({type:"error",message:error.message||"فشل إرسال الإشعار",errors:[]});}
    finally{setSending(false);}
  }

  return <section className="notification-page" dir="rtl" style={{maxWidth:900,margin:"0 auto",padding:28}}>
    <div className="notification-page-head" style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><div><h1>الإشعارات</h1><p>أرسل Push Notification لكل العملاء أو لعميل محدد.</p></div><BellRing size={28}/></div>
    <form className="notification-form" onSubmit={sendNotification} style={{background:"#fff",border:"1px solid #e2e9e6",borderRadius:12,padding:24,display:"grid",gap:16}}>
      <label><span>المستلمون</span><select value={audience} onChange={e=>setAudience(e.target.value)} style={{display:"block",width:"100%",padding:12,marginTop:7}}><option value="all">كل العملاء</option><option value="single">عميل محدد</option></select></label>
      {audience==="all"?<div><UsersRound size={18}/> كل الأجهزة المسجلة لدى العملاء</div>:<label><span>معرّف العميل</span><div><UserRound size={18}/><input value={userId} onChange={e=>setUserId(e.target.value)} placeholder="Firebase userId" style={{width:"100%",padding:12}}/></div></label>}
      <label><span>عنوان الإشعار</span><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="مثال: عرض جديد من Bringo" maxLength={80} style={{display:"block",width:"100%",padding:12,marginTop:7}}/></label>
      <label><span>الرسالة</span><textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="اكتب الرسالة التي ستظهر للعملاء" rows={5} maxLength={300} style={{display:"block",width:"100%",padding:12,marginTop:7}}/><small>{body.length}/300</small></label>
      {result&&<div style={{padding:14,borderRadius:9,background:result.type==="success"?"#eaf8f1":"#fff1f0",color:result.type==="success"?"#176443":"#b42318"}}><div style={{display:"flex",gap:8,fontWeight:800}}>{result.type==="success"?<CheckCircle2 size={19}/>:<AlertTriangle size={19}/>}<span>{result.message||(result.type==="success"?"تم تنفيذ طلب الإرسال":"لم يصل الإشعار لأي جهاز")}</span></div>{result.successCount!==undefined&&<div style={{display:"flex",gap:18,marginTop:10}}><span><Smartphone size={15}/> {result.deviceCount} جهاز</span><span><CheckCircle2 size={15}/> {result.successCount} نجح</span><span><XCircle size={15}/> {result.failureCount} فشل</span></div>}</div>}
      <button type="submit" disabled={!canSend} style={{padding:14,border:0,borderRadius:9,background:"#167a55",color:"#fff",fontWeight:900,cursor:"pointer",opacity:canSend?1:.6}}><Send size={18}/> {sending?"جاري الإرسال...":audience==="all"?"إرسال لكل العملاء":"إرسال الإشعار"}</button>
    </form>
  </section>;
}
