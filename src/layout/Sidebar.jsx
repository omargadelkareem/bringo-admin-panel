import { NavLink } from "react-router-dom";
import { LayoutGrid, ReceiptText, Bike, Store, Shapes, GalleryHorizontalEnd, Settings, ArrowUpLeft, CircleHelp, Plus, BellRing, X } from "lucide-react";

const primary=[
 {to:"/dashboard",label:"نظرة عامة",icon:LayoutGrid},
 {to:"/orders",label:"الطلبات",icon:ReceiptText},
 {to:"/drivers",label:"الطيارين",icon:Bike},
 {to:"/stores",label:"المتاجر",icon:Store},
 {to:"/stores/new",label:"إضافة متجر",icon:Plus},
];
const manage=[
 {to:"/categories",label:"الأقسام",icon:Shapes},
 {to:"/banners",label:"المحتوى والعروض",icon:GalleryHorizontalEnd},
 {to:"/notifications",label:"الإشعارات",icon:BellRing},
];

function LinkItem({item,onNavigate}){const Icon=item.icon;return <NavLink to={item.to} end={item.to==="/stores"} onClick={onNavigate} className={({isActive})=>`product-nav-item ${isActive?"is-active":""}`}><Icon size={18} strokeWidth={1.8}/><span>{item.label}</span><ArrowUpLeft className="product-nav-arrow" size={13}/></NavLink>}
export default function Sidebar({mobileOpen=false,onNavigate}){return <aside className={`sidebar product-sidebar ${mobileOpen?"mobile-open":""}`} dir="rtl">
 <div className="product-brand"><div><div className="wordmark">bringo<span>.</span></div><small>لوحة التشغيل</small></div><button className="mobile-sidebar-close" type="button" aria-label="إغلاق القائمة" onClick={onNavigate}><X size={20}/></button></div>
 <nav className="product-nav">
  <div className="product-nav-section">العمل اليومي</div>{primary.map(x=><LinkItem item={x} key={x.to} onNavigate={onNavigate}/>)}
  <div className="product-nav-section second">إدارة المنصة</div>{manage.map(x=><LinkItem item={x} key={x.to} onNavigate={onNavigate}/>)}
 </nav>
 <div className="product-sidebar-bottom"><NavLink to="/settings" onClick={onNavigate} className={({isActive})=>`product-nav-item ${isActive?"is-active":""}`}><Settings size={18}/><span>الإعدادات</span></NavLink><button className="sidebar-help" type="button"><CircleHelp size={17}/><span>مركز المساعدة</span></button><div className="product-user"><div className="user-initial">O</div><div><strong>Omar Gad</strong><small>Administrator</small></div><span className="user-online"/></div></div>
 </aside>}
