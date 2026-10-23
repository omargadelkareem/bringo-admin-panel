import { useEffect,useState } from "react";
import { db } from "../firebase";
import { ref,onValue,update } from "firebase/database";
import { Save,Truck,ShoppingBasket,Clock3,Power,ShieldCheck,MapPin } from "lucide-react";
import "../admin-v2.css";

const defaultZonePricing={
  enabled:true,
  zones:{
    sohag_east:{name:"شرق سوهاج",active:true},
    sohag_west:{name:"غرب سوهاج",active:true},
    kawamel:{name:"سوهاج الجديدة - الكوامل",active:true},
  },
  prices:{
    sohag_east:{sohag_east:20,sohag_west:35,kawamel:60},
    sohag_west:{sohag_east:35,sohag_west:20,kawamel:60},
    kawamel:{sohag_east:60,sohag_west:60,kawamel:20},
  }
};
const defaults={minOrder:0,deliveryPerKm:8,openingTime:"08:00",closingTime:"02:00",acceptOrders:true,deliveryZonePricing:defaultZonePricing};
const zoneRows=[
  ["sohag_east","sohag_east","شرق سوهاج","شرق سوهاج"],
  ["sohag_west","sohag_west","غرب سوهاج","غرب سوهاج"],
  ["sohag_east","sohag_west","شرق سوهاج","غرب سوهاج"],
  ["sohag_east","kawamel","شرق سوهاج","الكوامل"],
  ["sohag_west","kawamel","غرب سوهاج","الكوامل"],
  ["kawamel","kawamel","الكوامل","الكوامل"],
];

export default function SettingsPage(){
  const[form,setForm]=useState(defaults),[saving,setSaving]=useState(false);
  useEffect(()=>onValue(ref(db,"settings"),s=>{const data=s.val()||{};setForm({...defaults,...data,deliveryZonePricing:{...defaultZonePricing,...(data.deliveryZonePricing||{}),zones:{...defaultZonePricing.zones,...(data.deliveryZonePricing?.zones||{})},prices:{...defaultZonePricing.prices,...(data.deliveryZonePricing?.prices||{})}}})}),[]);
  const setPrice=(from,to,value)=>setForm(f=>{const n=Number(value||0);const prices={...f.deliveryZonePricing.prices,[from]:{...(f.deliveryZonePricing.prices[from]||{}),[to]:n},[to]:{...(f.deliveryZonePricing.prices[to]||{}),[from]:n}};return{...f,deliveryZonePricing:{...f.deliveryZonePricing,prices}}});
  const save=async e=>{e.preventDefault();setSaving(true);await update(ref(db,"settings"),{...form,minOrder:Number(form.minOrder||0),deliveryPerKm:Number(form.deliveryPerKm||0),deliveryZonePricing:form.deliveryZonePricing,updatedAt:Date.now()});setSaving(false);alert("تم حفظ إعدادات Bringo")};
  return <div className="settings-product-page" dir="rtl"><div className="catalog-heading"><div><span>SYSTEM</span><h1>إعدادات Bringo</h1><p>إعدادات التشغيل والأسعار التي تتحكم في الطلب والتوصيل.</p></div><div className="settings-safe"><ShieldCheck size={16}/> التغييرات تحفظ مباشرة في Firebase</div></div><form onSubmit={save} className="settings-layout">
    <section className="settings-section"><div className="settings-section-title"><ShoppingBasket size={18}/><div><h3>الطلبات</h3><p>القواعد الأساسية لإنشاء الطلب.</p></div></div><div className="settings-row"><div><strong>الحد الأدنى للطلب</strong><small>أقل قيمة منتجات تسمح للعميل بإتمام الطلب.</small></div><div className="setting-input"><input type="number" value={form.minOrder} onChange={e=>setForm({...form,minOrder:e.target.value})}/><span>جنيه</span></div></div><div className="settings-row"><div><strong>استقبال الطلبات</strong><small>إيقافه يمنع إنشاء طلبات جديدة مؤقتًا.</small></div><button type="button" className={`product-switch ${form.acceptOrders?"on":""}`} onClick={()=>setForm({...form,acceptOrders:!form.acceptOrders})}><i/></button></div></section>
    <section className="settings-section"><div className="settings-section-title"><MapPin size={18}/><div><h3>مناطق وأسعار التوصيل</h3><p>التسعير الحالي داخل سوهاج. السعر يعمل في الاتجاهين تلقائيًا.</p></div></div>{zoneRows.map(([from,to,fromName,toName])=><div className="settings-row" key={`${from}-${to}`}><div><strong>{fromName} ← {toName}</strong><small>{from===to?"طلب داخل نفس المنطقة":"سعر التوصيل بين المنطقتين"}</small></div><div className="setting-input"><input type="number" min="0" step="1" value={form.deliveryZonePricing?.prices?.[from]?.[to]??0} onChange={e=>setPrice(from,to,e.target.value)}/><span>جنيه</span></div></div>)}</section>
    <section className="settings-section"><div className="settings-section-title"><Truck size={18}/><div><h3>التسعير القديم</h3><p>سعر الكيلومتر محفوظ للتوافق مع الإصدارات القديمة فقط.</p></div></div><div className="settings-row"><div><strong>سعر الكيلومتر القديم</strong><small>لن يكون هو التسعير الأساسي بعد تفعيل المناطق.</small></div><div className="setting-input"><input type="number" value={form.deliveryPerKm} onChange={e=>setForm({...form,deliveryPerKm:e.target.value})}/><span>ج / كم</span></div></div></section>
    <section className="settings-section"><div className="settings-section-title"><Clock3 size={18}/><div><h3>ساعات التشغيل</h3><p>الفترة الافتراضية التي تستقبل فيها المنصة الطلبات.</p></div></div><div className="settings-row"><div><strong>بداية العمل</strong></div><input className="time-input" type="time" value={form.openingTime} onChange={e=>setForm({...form,openingTime:e.target.value})}/></div><div className="settings-row"><div><strong>نهاية العمل</strong></div><input className="time-input" type="time" value={form.closingTime} onChange={e=>setForm({...form,closingTime:e.target.value})}/></div></section>
    <div className="settings-savebar"><div><Power size={15}/><span>{form.acceptOrders?"Bringo يستقبل الطلبات الآن":"استقبال الطلبات متوقف"}</span></div><button className="product-primary" disabled={saving}><Save size={15}/>{saving?"جاري الحفظ...":"حفظ التغييرات"}</button></div>
  </form></div>
}
