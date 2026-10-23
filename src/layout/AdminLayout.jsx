import { Outlet, useLocation } from "react-router-dom";
import { Bell, Search, Wifi } from "lucide-react";
import Sidebar from "./Sidebar";
import "../admin-v2.css";

const titles={"/dashboard":["مركز العمليات","نظرة لحظية على أداء Bringo"],"/orders":["إدارة الطلبات","متابعة كل الطلبات والتوصيل"],"/drivers":["إدارة الطيارين","حالة وأداء فريق التوصيل"],"/products":["المنتجات","إدارة كتالوج Bringo"],"/categories":["الأقسام","تنظيم أقسام المنتجات"],"/stores":["المتاجر والمطاعم","إدارة شركاء Bringo"],"/banners":["البانرات والعروض","إدارة المحتوى التسويقي"],"/settings":["إعدادات النظام","إعدادات وتشغيل المنصة"]};
export default function AdminLayout(){const {pathname}=useLocation();const key=Object.keys(titles).find(k=>pathname.startsWith(k))||"/dashboard";const [title,sub]=titles[key];return <div className="admin-layout"><Sidebar/><main className="main-content"><header className="topbar bringo-topbar"><div className="topbar-title"><h2>{title}</h2><p>{sub}</p></div><div className="topbar-actions"><div className="topbar-live"><Wifi size={14}/> Live</div><button className="topbar-icon"><Search size={18}/></button><button className="topbar-icon notification"><Bell size={18}/><i/></button><div className="topbar-user"><div className="admin-avatar">OG</div><div><strong>Omar Gad</strong><span>Administrator</span></div></div></div></header><Outlet/></main></div>}
