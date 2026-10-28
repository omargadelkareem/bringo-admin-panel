import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Bell, Search, Wifi, Menu, X } from "lucide-react";
import Sidebar from "./Sidebar";
import "../admin-v2.css";
import "../mobile-responsive.css";

const titles={"/dashboard":["مركز العمليات","نظرة لحظية على أداء Bringo"],"/orders":["إدارة الطلبات","متابعة كل الطلبات والتوصيل"],"/drivers":["إدارة الطيارين","حالة وأداء فريق التوصيل"],"/categories":["الأقسام","تنظيم أقسام المنصة"],"/stores":["المتاجر والمطاعم","كل متجر يدير كتالوج ومنتجاته بشكل مستقل"],"/banners":["البانرات والعروض","إدارة المحتوى التسويقي"],"/settings":["إعدادات النظام","إعدادات وتشغيل المنصة"]};

export default function AdminLayout(){
 const {pathname}=useLocation();
 const [mobileMenuOpen,setMobileMenuOpen]=useState(false);
 const key=Object.keys(titles).find(k=>pathname.startsWith(k))||"/dashboard";
 const [title,sub]=titles[key];
 const closeMenu=()=>setMobileMenuOpen(false);

 return <div className="admin-layout">
  <Sidebar mobileOpen={mobileMenuOpen} onNavigate={closeMenu}/>
  {mobileMenuOpen&&<button className="mobile-sidebar-backdrop" aria-label="إغلاق القائمة" onClick={closeMenu}/>} 
  <main className="main-content">
   <header className="topbar bringo-topbar">
    <div className="mobile-topbar-start">
     <button className="mobile-menu-button" type="button" aria-label={mobileMenuOpen?"إغلاق القائمة":"فتح القائمة"} onClick={()=>setMobileMenuOpen(v=>!v)}>{mobileMenuOpen?<X size={21}/>:<Menu size={21}/>}</button>
     <div className="topbar-title"><h2>{title}</h2><p>{sub}</p></div>
    </div>
    <div className="topbar-actions"><div className="topbar-live"><Wifi size={14}/> Live</div><button className="topbar-icon"><Search size={18}/></button><button className="topbar-icon notification"><Bell size={18}/><i/></button><div className="topbar-user"><div className="admin-avatar">OG</div><div><strong>Omar Gad</strong><span>Administrator</span></div></div></div>
   </header>
   <Outlet/>
  </main>
 </div>
}