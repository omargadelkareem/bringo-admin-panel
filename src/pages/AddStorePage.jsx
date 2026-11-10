import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, push, ref, set, update } from "firebase/database";
import { ArrowRight, ImagePlus, KeyRound, MapPin, Save, Store } from "lucide-react";
import { db } from "../firebase";
import "../admin-v2.css";

const MAP_CENTER = { lat: 26.5569, lng: 31.6948 };


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

const emptyProvider = { name: "", email: "", password: "", isActive: true };

export default function AddStorePage() {
  const navigate = useNavigate();
  const { storeId } = useParams();
  const isEdit = Boolean(storeId);
  const [form, setForm] = useState(emptyForm);
  const [provider, setProvider] = useState(emptyProvider);
  const [providerId, setProviderId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapError, setMapError] = useState(false);
  const mapElement = useRef(null);
  const mapInstance = useRef(null);
  const markerInstance = useRef(null);
  const onPick = useRef(null);
  onPick.current = ({ lat, lng }) => { setForm(prev => ({ ...prev, latitude: lat.toFixed(6), longitude: lng.toFixed(6) })); setError(""); };
  useEffect(() => {
    if (!mapOpen || !mapElement.current) return;
    let cancelled = false;
    const initialize = async () => {
      try {
        if (!document.getElementById("bringo-leaflet-css")) {
          const css = document.createElement("link"); css.id = "bringo-leaflet-css"; css.rel = "stylesheet"; css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; document.head.appendChild(css);
        }
        if (!window.L) {
          await new Promise((resolve, reject) => {
            const script = document.createElement("script"); script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"; script.onload = resolve; script.onerror = () => reject(new Error("Map library unavailable")); document.head.appendChild(script);
          });
        }
        if (cancelled || !mapElement.current || mapInstance.current) return;
        const L = window.L;
        const lat = Number(form.latitude), lng = Number(form.longitude);
        const valid = form.latitude !== "" && form.longitude !== "" && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
        const center = valid ? [lat, lng] : [MAP_CENTER.lat, MAP_CENTER.lng];
        const map = L.map(mapElement.current).setView(center, valid ? 16 : 12);
        mapInstance.current = map;
        L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", { attribution: "Tiles &copy; Esri", maxZoom: 19 }).addTo(map);
        if (valid) markerInstance.current = L.marker(center).addTo(map);
        map.on("click", event => {
          const position = event.latlng;
          if (markerInstance.current) markerInstance.current.setLatLng(position);
          else markerInstance.current = L.marker(position).addTo(map);
          onPick.current(position);
        });
        setTimeout(() => { if (!cancelled) map.invalidateSize(); }, 100);
      } catch { if (!cancelled) setMapError(true); }
    };
    initialize();
    return () => { cancelled = true; if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; markerInstance.current = null; } };
  }, [mapOpen]);
  useEffect(() => {
    const lat = Number(form.latitude), lng = Number(form.longitude);
    if (!mapInstance.current || !form.latitude || !form.longitude || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return;
    const L = window.L;
    if (markerInstance.current) markerInstance.current.setLatLng([lat, lng]);
    else markerInstance.current = L.marker([lat, lng]).addTo(mapInstance.current);
    mapInstance.current.panTo([lat, lng]);
  }, [form.latitude, form.longitude]);
  useEffect(() => {
    if (!storeId) return;
    let active = true;
    Promise.all([get(ref(db, `stores/${storeId}`)), get(ref(db, "providerUsers"))])
      .then(([snapshot, providersSnapshot]) => {
        if (!snapshot.exists()) throw new Error("المتجر غير موجود");
        const value = snapshot.val();
        if (!active) return;
        setForm({ ...emptyForm, ...value, latitude: String(value.latitude ?? value.location?.latitude ?? ""), longitude: String(value.longitude ?? value.location?.longitude ?? "") });
        const found = Object.entries(providersSnapshot.val() || {}).find(([, user]) => String(user?.storeId || "") === String(storeId));
        if (found) {
          setProviderId(found[0]);
          setProvider({ ...emptyProvider, ...found[1], password: String(found[1]?.password || ""), isActive: found[1]?.isActive !== false });
        }
      })
      .catch(e => { if (active) setError(e.message || "تعذر تحميل المتجر"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [storeId]);

  const change = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const changeProvider = (key, value) => setProvider(prev => ({ ...prev, [key]: value }));

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

    const hasProvider = provider.name.trim() || provider.email.trim() || provider.password.trim() || Boolean(providerId);
    if (hasProvider && !provider.name.trim()) return setError("اكتب اسم مستخدم المتجر");
    if (hasProvider && !provider.email.trim()) return setError("اكتب البريد الإلكتروني لمستخدم المتجر");
    if (hasProvider && !provider.password.trim()) return setError("اكتب كلمة مرور مستخدم المتجر");
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
      if (isEdit) await update(storeRef, data);
      else await set(storeRef, { ...data, createdAt: now });
      if (hasProvider) {
        const pid = providerId || push(ref(db, "providerUsers")).key;
        await set(ref(db, `providerUsers/${pid}`), {
          id: pid, storeId: id, storeName: form.name.trim(),
          name: provider.name.trim(), email: provider.email.trim().toLowerCase(),
          password: provider.password.trim(), role: "provider",
          isActive: provider.isActive !== false,
          createdAt: providerId ? (provider.createdAt || now) : now, updatedAt: now,
        });
      }
      if (isEdit) navigate("/stores");
      else navigate(`/stores/${id}/products`);
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
        <p style={{ color: "#697773", fontSize: 13 }}>افتح الخريطة واضغط على موقع المتجر، وهتتسجل الإحداثيات تلقائيًا. تقدر تحرك الخريطة وتكبرها لتحديد المكان بدقة.</p>
        <button type="button" style={primaryButton} onClick={() => { setMapOpen(v => !v); setMapError(false); }}><MapPin size={17}/>{mapOpen ? "إغلاق الخريطة" : "تحديد موقع المتجر على الخريطة"}</button>
        {mapOpen && <div style={{ marginTop: 14 }}>
          {mapError && <p style={{ color: "#b42318" }}>تعذر تحميل الخريطة التفاعلية. استخدم زر موقعي الحالي أو أدخل الإحداثيات يدويًا.</p>}
          <div ref={mapElement} style={{ width: "100%", height: 350, border: "1px solid #d8e2de", borderRadius: 12, overflow: "hidden", display: mapError ? "none" : "block" }} />
          <p style={{ fontSize: 12, color: "#697773" }}>اضغط مرة واحدة على مكان المتجر لوضع العلامة وحفظ الإحداثيات في الحقول أدناه.</p>
        </div>}
        <div style={{ ...gridStyle, marginTop: 14 }}>
          <Field label="خط العرض Latitude *"><input style={inputStyle} type="number" step="any" value={form.latitude} onChange={e => change("latitude", e.target.value)} placeholder="26.55..." /></Field>
          <Field label="خط الطول Longitude *"><input style={inputStyle} type="number" step="any" value={form.longitude} onChange={e => change("longitude", e.target.value)} placeholder="31.69..." /></Field>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
          <button type="button" style={secondaryButton} onClick={() => {
            if (!navigator.geolocation) return setError("المتصفح لا يدعم تحديد الموقع");
            navigator.geolocation.getCurrentPosition(
              pos => { setForm(prev => ({ ...prev, latitude: String(pos.coords.latitude), longitude: String(pos.coords.longitude) })); setError(""); },
              () => setError("تعذر تحديد الموقع. تأكد من السماح للموقع أو أدخل الإحداثيات يدويًا"),
              { enableHighAccuracy: true, timeout: 15000 }
            );
          }}>استخدام موقعي الحالي</button>
          <button type="button" style={secondaryButton} onClick={() => window.open("https://www.google.com/maps", "_blank", "noopener,noreferrer")}>فتح Google Maps كبديل</button>
        </div>
        <div style={{ ...sectionTitle, marginTop: 26 }}><KeyRound size={18}/> حساب مستخدم المتجر</div>
        <p style={{ color: "#697773", fontSize: 13 }}>بيانات الدخول للوحة صاحب المتجر. عند تعديل متجر موجود هتظهر بيانات حسابه المسجلة.</p>
        <div style={gridStyle}>
          <Field label="اسم المستخدم"><input style={inputStyle} value={provider.name} onChange={e => changeProvider("name", e.target.value)} placeholder="اسم صاحب / مدير المتجر" /></Field>
          <Field label="البريد الإلكتروني"><input type="email" style={inputStyle} value={provider.email} onChange={e => changeProvider("email", e.target.value)} placeholder="store@example.com" /></Field>
          <Field label="كلمة المرور"><input type="password" autoComplete="new-password" style={inputStyle} value={provider.password} onChange={e => changeProvider("password", e.target.value)} placeholder="كلمة مرور لوحة المتجر" /></Field>
          <Field label="حالة الحساب"><select style={inputStyle} value={provider.isActive ? "active" : "disabled"} onChange={e => changeProvider("isActive", e.target.value === "active")}><option value="active">مفعل</option><option value="disabled">موقوف</option></select></Field>
        </div>
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
          <button type="submit" disabled={saving} style={{ ...primaryButton, opacity: saving ? .65 : 1 }}><Save size={17}/>{saving ? "جاري الحفظ..." : isEdit ? "حفظ التعديلات" : "حفظ وفتح المنتجات"}</button>
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
