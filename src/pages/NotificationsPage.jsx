import { useMemo, useState } from "react";
import { BellRing, Send, UserRound } from "lucide-react";

const API_BASE = import.meta.env.VITE_NOTIFICATION_API_URL || "http://localhost:3001";
const API_KEY = import.meta.env.VITE_BRINGO_ADMIN_API_KEY || "bringo-local-admin";

export default function NotificationsPage() {
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const canSend = useMemo(
    () => userId.trim() && title.trim() && body.trim() && !sending,
    [userId, title, body, sending],
  );

  async function sendNotification(event) {
    event.preventDefault();
    if (!canSend) return;
    setSending(true);
    setResult(null);

    try {
      const response = await fetch(`${API_BASE}/api/send-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          userId: userId.trim(),
          title: title.trim(),
          body: body.trim(),
          data: { source: "admin" },
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "فشل إرسال الإشعار");
      if (!payload.ok) throw new Error(payload.errors?.[0]?.message || "لم يصل الإشعار لأي جهاز");

      setResult({ type: "success", text: `تم الإرسال بنجاح إلى ${payload.successCount || 1} جهاز.` });
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
        <div><h3>إرسال إشعار</h3><p>أرسل إشعار Push مباشر لعميل محدد.</p></div>
        <BellRing size={24} />
      </div>
      <form className="notification-form" onSubmit={sendNotification}>
        <label><span>معرّف العميل</span><div className="notification-input-wrap"><UserRound size={18}/><input value={userId} onChange={(e)=>setUserId(e.target.value)} placeholder="Firebase userId" autoComplete="off"/></div></label>
        <label><span>عنوان الإشعار</span><input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="مثال: طلبك في الطريق" maxLength={80}/></label>
        <label><span>الرسالة</span><textarea value={body} onChange={(e)=>setBody(e.target.value)} placeholder="اكتب الرسالة التي ستظهر للعميل" rows={5} maxLength={300}/><small>{body.length}/300</small></label>
        {result && <div className={`notification-result ${result.type}`}>{result.text}</div>}
        <button className="notification-send" type="submit" disabled={!canSend}><Send size={18}/>{sending ? "جاري الإرسال..." : "إرسال الإشعار"}</button>
      </form>
    </section>
  );
}
