import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, push, ref, set, update } from "firebase/database";
import { ArrowRight, ImagePlus, MapPin, Save, Store } from "lucide-react";
import { db } from "../firebase";
import "../admin-v2.css";

const types = {
  restaurant: "مطعم",
  supermarket: "سوبر ماركت",
  pharmacy: "صيدلية",
  beauty: "مستحضرات تجميل",
  vegetables: "خضار وفاكهة",
  bakery: "حلويات ومخبوزات",
  meat: "لحوم ودواجن",
  fish: "أسماك",
  market: "متجر متنوع",
};

const zones = {
  sohag_east: "شرق سوهاج",
  sohag_west: "غرب سوهاج",
  kawamel: "سوهاج الجديدة - الكوامل",
};

const emptyForm = {
  name: "",
  type: "restaurant",
  phone: "",
  address: "",
  latitude: "",
  longitude: "",
  deliveryZoneId: "",
  image: "",
  tags: "",
  description: "",
  isOpen: true,
};

export default function AddStorePage() {
  const navigate = useNavigate();
  const { storeId } = useParams();
  const isEdit = Boolean(storeId);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(isEdit);
  useEffect(() => { if (!storeId) return; let active = true; get(ref(db, `stores/${storeId}`)).then(snapshot => { if (!snapshot.exists()) throw new Error("المتجر غير موجود"); const value = snapshot.val(); if (active) setForm({...emptyForm,...value, latitude: String(value.latitude ?? value.location?.latitude ?? ""), longitude: String(value.longitude ?? value.location?.longitude ?? "")}); }).catch(e => { if(active) setError(e.message || "تعذر تحميل المتجر"); }).finally(() => {if(active) setLoading(false);}); return () => {active=false}; }, [storeId]);

  const change = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("اختار صورة صحيحة للمتجر");
    if (file.size > 1.5 * 1024 * 1024) return setError("صورة المتجر يجب أن تكون أقل من 1.5MB");
    const reader = new FileReader();
    reader.onload = () => change("image", String(reader.result || ""));
    reader.onerror = () => setError("تعذر قراءة الصورة");
    reader.readAsDataURL(file);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("اكتب اسم المتجر");
    if (!form.phone.trim()) return setError("اكتب رقم هاتف المتجر");
    if (!form.address.trim()) return setError("اكتب عنوان المتجر");
    if (!form.deliveryZoneId) return setError("حدد منطقة توصيل المتجر");
    const lat = Number(form.latitude), lng = Number(form.longitude);
    if (!form.latitude || !form.longitude || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) return setError("حدد إحداثيات المتجر الصحيحة لحساب رسوم التوصيل");

    try {
      setSaving(true);
      const storeRef = isEdit ? ref(db, `stores/${storeId}`) : push(ref(db, "stores"));
      const id = storeId || storeRef.key;
      const now = Date.now();
      const data = {
        id,
        name: form.name.trim(),
        type: form.type,
        phone: form.phone.trim(),
        address: form.address.trim(),
        latitude: lat,
        longitude: lng,
        deliveryZoneId: form.deliveryZoneId,
        deliveryZoneName: zones[form.deliveryZoneId],
        image: form.image,
        tags: form.tags.trim(),
        description: form.description.trim(),
        isOpen: form.isOpen,
        acceptsOrders: form.isOpen,
        updatedAt: now,
      };
      if (isEdit) { await update(storeRef, data); navigate("/stores"); }
      else { await set(storeRef, {...data, createdAt: now}); navigate(`/stores/${id}/products`); }
    } catch (e) {
      console.error("Add store error:", e);
      setError(`تعذر إضافة المتجر${e?.code ? ` (${e.code})` : ""}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div dir="rtl" style={{padding:28}}>جاري تحميل بيانات المتجر...</div>;
  return (
    <div dir="rtl" style={{ padding: "28px", maxWidth: 1050, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 22 }}>
        <div>
          <small style={{ color: "#167a55", fontWeight: 900 }}>{isEdit ? "EDIT PARTNER" : "NEW PARTNER"}</small>
          <h1 style={{ margin: "5px 0 6px", color: "#17312a" }}>{isEdit ? "تعديل بيانات المتجر" : "إضافة متجر جديد"}</h1>
          <p style={{ margin: 0, color: "#697773" }}>{isEdit ? "عدّل بيانات المتجر وموقعه." : "سجّل بيانات المتجر، وبعد الحفظ هنفتح صفحة المنتجات مباشرة."}</p>
        </div>
        <button type="button" onClick={() => navigate("/stores")} style={secondaryButton}><ArrowRight size={17}/> رجوع للمتاجر</button>
      </div>

      <form onSubmit={submit} style={cardStyle}>
        <div style={sectionTitle}><Store size={18}/> بيانات المتجر</div>
        <div style={gridStyle}>
          <Field label="اسم المتجر *"><input style={inputStyle} value={form.name} onChange={(e) => change("name", e.target.value)} placeholder="مثال: مطعم أبو علي" /></Field>
          <Field label="نوع المتجر *"><select style={inputStyle} value={form.type} onChange={(e) => change("type", e.target.value)}>{Object.entries(types).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></Field>
          <Field label="رقم الهاتف *"><input style={inputStyle} value={form.phone} onChange={(e) => change("phone", e.target.value)} placeholder="01xxxxxxxxx" /></Field>
          <Field label="العنوان *"><input style={inputStyle} value={form.address} onChange={(e) => change("address", e.target.value)} placeholder="الشارع / المنطقة / علامة مميزة" /></Field>
        </div>

        <div style={{ ...sectionTitle, marginTop: 26 }}><MapPin size={18}/> منطقة التوصيل</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
          {Object.entries(zones).map(([id, name]) => (
            <button key={id} type="button" onClick={() => change("deliveryZoneId", id)} style={{ ...zoneButton, ...(form.deliveryZoneId === id ? selectedZoneButton : {}) }}>{name}</button>
          ))}
        </div>

        <div style={{ ...sectionTitle, marginTop: 26 }}><MapPin size={18}/> موقع المتجر على الخريطة</div>
        <p style={{ color: "#697773", fontSize: 12 }}>افتح خرائط OpenStreetMap، اضغط مطولاً على موقع المتجر وانسخ خط العرض وخط الطول. أو استخدم موقعي الحالي لو أنت داخل المتجر.</p>
        <div style={gridStyle}>
          <Field label="خط العرض Latitude *"><input style={inputStyle} type="number" step="any" value={form.latitude} onChange={e => change("latitude", e.target.value)} placeholder="26.55..." /></Field>
          <Field label="خط الطول Longitude *"><input style={inputStyle} type="number" step="any" value={form.longitude} onChange={e => change("longitude", e.target.value)} placeholder="31.69..." /></Field>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
          <button type="button" style={secondaryButton} onClick={() => window.open("https://www.openstreetmap.org/", "_blank", "noopener,noreferrer")}>فتح الخريطة</button>
          <button type="button" style={secondaryButton} onClick={() => {
            if (!navigator.geolocation) return setError("المتصفح لا يدعم تحديد الموقع");
            navigator.geolocation.getCurrentPosition(
              pos => { setForm(prev => ({ ...prev, latitude: String(pos.coords.latitude), longitude: String(pos.coords.longitude) })); setError(""); },
              () => setError("تعذر تحديد الموقع. تأكد من السماح للموقع أو أدخل الإحداثيات يدويًا"),
              { enableHighAccuracy: true, timeout: 15000 }
            );
          }}>استخدام موقعي الحالي</button>
        </div>
        {form.latitude && form.longitude && Number.isFinite(Number(form.latitude)) && Number.isFinite(Number(form.longitude)) && <iframe title="معاينة موقع المتجر" style={{ width: "100%", height: 250, border: "1px solid #d8e2de", borderRadius: 12, marginTop: 14 }} loading="lazy" src={`https://www.openstreetmap.org/export/embed.html?marker=${encodeURIComponent(form.latitude)},${encodeURIComponent(form.longitude)}&layer=mapnik`} />}
        <div style={{ ...sectionTitle, marginTop: 26 }}><ImagePlus size={18}/> تفاصيل إضافية</div>
        <div style={gridStyle}>
          <Field label="صورة / لوجو المتجر"><input type="file" accept="image/*" onChange={handleImage} /></Field>
          <Field label="كلمات وصفية"><input style={inputStyle} value={form.tags} onChange={(e) => change("tags", e.target.value)} placeholder="برجر، بيتزا، وجبات سريعة" /></Field>
          <Field label="وصف مختصر"><textarea style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} value={form.description} onChange={(e) => change("description", e.target.value)} placeholder="نبذة بسيطة عن المتجر" /></Field>
          <Field label="حالة المتجر"><select style={inputStyle} value={form.isOpen ? "open" : "closed"} onChange={(e) => change("isOpen", e.target.value === "open")}><option value="open">مفتوح ويستقبل طلبات</option><option value="closed">مغلق مؤقتًا</option></select></Field>
        </div>

        {form.image && <div style={{ marginTop: 16 }}><img src={form.image} alt="معاينة" style={{ width: 110, height: 110, borderRadius: 14, objectFit: "cover", border: "1px solid #dce5e1" }} /></div>}
        {error && <div style={{ marginTop: 18, padding: 13, borderRadius: 9, background: "#fff1f0", color: "#b42318", fontWeight: 800 }}>{error}</div>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 26, paddingTop: 20, borderTop: "1px solid #e8eeeb" }}>
          <button type="button" onClick={() => navigate("/stores")} style={secondaryButton}>إلغاء</button>
          <button type="submit" disabled={saving} style={{ ...primaryButton, opacity: saving ? .65 : 1 }}><Save size={17}/>{saving ? "جاري إضافة المتجر..." : {isEdit ? "حفظ التعديلات" : "حفظ وفتح المنتجات"}}</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return <label style={{ display: "grid", gap: 7, color: "#344b44", fontWeight: 800, fontSize: 13 }}>{label}{children}</label>;
}

const cardStyle = { background: "#fff", border: "1px solid #e2e9e6", borderRadius: 12, padding: 24 };
const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16 };
const sectionTitle = { display: "flex", alignItems: "center", gap: 8, color: "#173f34", fontWeight: 900, marginBottom: 14 };
const inputStyle = { width: "100%", boxSizing: "border-box", padding: "12px 13px", border: "1px solid #d8e2de", borderRadius: 9, background: "#fff", outline: "none", fontFamily: "inherit" };
const zoneButton = { padding: "14px", border: "1px solid #d8e2de", borderRadius: 9, background: "#fff", color: "#40534d", fontWeight: 800, cursor: "pointer" };
const selectedZoneButton = { border: "2px solid #167a55", background: "#edf8f3", color: "#116346" };
const primaryButton = { display: "inline-flex", alignItems: "center", gap: 7, padding: "12px 18px", border: 0, borderRadius: 9, background: "#167a55", color: "#fff", fontWeight: 900, cursor: "pointer" };
const secondaryButton = { display: "inline-flex", alignItems: "center", gap: 7, padding: "11px 15px", border: "1px solid #d8e2de", borderRadius: 9, background: "#fff", color: "#40534d", fontWeight: 800, cursor: "pointer" };
