import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Bell, Search, Wifi, X, Package } from "lucide-react";
import { onValue, ref } from "firebase/database";
import { db } from "../firebase";
import Sidebar from "./Sidebar";
import "../admin-v2.css";

const titles={"/dashboard":["مركز العمليات","نظرة لحظية على أداء Bringo"],"/orders":["إدارة الطلبات","متابعة كل الطلبات والتوصيل"],"/drivers":["إدارة الطيارين","حالة وأداء فريق التوصيل"],"/categories":["الأقسام","تنظيم أقسام المنصة"],"/stores":["المتاجر والمطاعم","كل متجر يدير كتالوج ومنتجاته بشكل مستقل"],"/banners":["البانرات والعروض","إدارة المحتوى التسويقي"],"/settings":["إعدادات النظام","إعدادات وتشغيل المنصة"]};
export default function AdminLayout(){
 const {pathname}=useLocation(),navigate=useNavigate();
 const key=Object.keys(titles).find(k=>pathname.startsWith(k))||"/dashboard";
 const [title,sub]=titles[key];
 const [orders,setOrders]=useState([]),[open,setOpen]=useState(false);
 useEffect(()=>onValue(ref(db,"orders"),snap=>setOrders(Object.entries(snap.val()||{}).map(([id,o])=>({id,...o})).sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0)))),[]);
 const recent=orders.slice(0,12);
 return <div className="admin-layout"><Sidebar/><main className="main-content">
 <header className="topbar bringo-topbar"><div className="topbar-title"><h2>{title}</h2><p>{sub}</p></div>
 <div className="topbar-actions"><div className="topbar-live"><Wifi size={14}/> Live</div>
 <button className="topbar-icon" onClick={()=>navigate("/orders")} title="بحث في الطلبات"><Search size={18}/></button>
 <button className="topbar-icon notification" onClick={()=>setOpen(true)} title="الإشعارات"><Bell size={18}/>{recent.length>0&&<i/>}</button>
 <div className="topbar-user"><div className="admin-avatar">OG</div><div><strong>Omar Gad</strong><span>Administrator</span></div></div></div></header><Outlet/></main>
 {open&&<div className="bringo-dialog-backdrop" onMouseDown={()=>setOpen(false)}>
 <section className="bringo-dialog" dir="rtl" role="dialog" aria-modal="true" aria-label="إشعارات الطلبات" onMouseDown={e=>e.stopPropagation()}>
 <div className="bringo-dialog-header"><div><small>BRINGO NOTIFICATIONS</small><h2>إشعارات الطلبات</h2><p>آخر الطلبات في المنصة، بتحديث مباشر</p></div><button onClick={()=>setOpen(false)} aria-label="إغلاق"><X size={20}/></button></div>
 <div className="bringo-dialog-content">{recent.length?recent.map(o=><button className="bringo-notification-item" key={o.id} onClick={()=>{setOpen(false);navigate("/orders")}}><Package size={20}/><span><strong>طلب #{String(o.id).slice(-7)}</strong><small>{o.customerName||o.storeName||"طلب جديد"} · {o.status||o.orderStatus||"جديد"}</small></span></button>):<p>لا توجد طلبات حتى الآن</p>}</div>
 <div className="bringo-dialog-footer"><button onClick={()=>setOpen(false)}>إغلاق</button><button className="bringo-dialog-primary" onClick={()=>{setOpen(false);navigate("/orders")}}>عرض جميع الطلبات</button></div>
 </section></div>}
 </div>;
}
