import { useMemo, useState } from "react";
import { BellRing, Send, UserRound, UsersRound } from "lucide-react";

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

    setSending(true);
    setResult(null);

    try {
      const isBroadcast = audience === "all";
      const endpoint = isBroadcast ? "/api/send-notification-all" : "/api/send-notification";
      const requestBody = {
        title: title.trim(),
        body: body.trim(),
        data: { source: "admin" },
      };
      if (!isBroadcast) requestBody.userId = userId.trim();

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "فشل إرسال الإشعار");
      if (!payload.ok) throw new Error(payload.errors?.[0]?.message || "لم يصل الإشعار لأي جهاز");

      setResult({
        type: "success",
        text: isBroadcast
          ? `تم الإرسال إلى ${payload.successCount || 0} جهاز من ${payload.deviceCount || 0} جهاز مسجل.`
          : `تم الإرسال بنجاح إلى ${payload.successCount || 1} جهاز.`,
      });
      setTitle("");
      setBody("");
    } catch (error) {
      setResult({ type: "error", text: error.message || "فشل إرسال الإشعار" });
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="notification-page" dir="rtl">
      <div className="notification-page-head">
        <div><h3>إرسال إشعار</h3><p>أرسل إشعار Push لكل العملاء أو لعميل محدد.</p></div>
        <BellRing size={24} />
      </div>
      <form className="notification-form" onSubmit={sendNotification}>
        <label>
          <span>المستلمون</span>
          <select value={audience} onChange={(e) => setAudience(e.target.value)}>
            <option value="all">كل العملاء</option>
            <option value="single">عميل محدد</option>
          </select>
        </label>

        {audience === "all" ? (
          <div className="notification-input-wrap"><UsersRound size={18}/><span>كل الأجهزة المسجلة لدى العملاء</span></div>
        ) : (
          <label><span>معرّف العميل</span><div className="notification-input-wrap"><UserRound size={18}/><input value={userId} onChange={(e)=>setUserId(e.target.value)} placeholder="Firebase userId" autoComplete="off"/></div></label>
        )}

        <label><span>عنوان الإشعار</span><input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="مثال: عرض جديد من Bringo" maxLength={80}/></label>
        <label><span>الرسالة</span><textarea value={body} onChange={(e)=>setBody(e.target.value)} placeholder="اكتب الرسالة التي ستظهر للعملاء" rows={5} maxLength={300}/><small>{body.length}/300</small></label>
        {result && <div className={`notification-result ${result.type}`}>{result.text}</div>}
        <button className="notification-send" type="submit" disabled={!canSend}><Send size={18}/>{sending ? "جاري الإرسال..." : audience === "all" ? "إرسال لكل العملاء" : "إرسال الإشعار"}</button>
      </form>
    </section>
  );
}
