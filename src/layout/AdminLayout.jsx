import { Outlet, useLocation } from "react-router-dom";
import { Bell, Search, Wifi, ChevronDown } from "lucide-react";
import Sidebar from "./Sidebar";

const pageNames = {
  "/dashboard": ["مركز العمليات", "راقب الطلبات والمبيعات والتشغيل لحظة بلحظة"],
  "/orders": ["إدارة الطلبات", "متابعة دورة الطلب من الاستلام حتى التسليم"],
  "/drivers": ["إدارة الطيارين", "متابعة وتفعيل فريق التوصيل"],
  "/products": ["المنتجات", "إدارة كتالوج Bringo والأسعار والتوفر"],
  "/categories": ["الأقسام", "تنظيم أقسام المنتجات وتجربة التسوق"],
  "/stores": ["المتاجر", "إدارة شركاء Bringo ونقاط البيع"],
  "/banners": ["الحملات والبنرات", "إدارة المحتوى التسويقي داخل التطبيق"],
  "/settings": ["الإعدادات", "إعدادات التشغيل والنظام"],
};

export default function AdminLayout() {
  const location = useLocation();
  const current = Object.entries(pageNames).find(([path]) => location.pathname.startsWith(path));
  const [title, subtitle] = current?.[1] || ["Bringo", "لوحة إدارة المنصة"];

  return (
    <div className="admin-layout">
      <Sidebar />

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-title">
            <div className="topbar-breadcrumb">BRINGO <span>/</span> OPERATIONS</div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>

          <div className="topbar-actions">
            <div className="system-status"><Wifi size={14} /><span>Live</span></div>
            <button className="topbar-search" type="button" aria-label="بحث"><Search size={18} /></button>
            <button className="topbar-notification" type="button" aria-label="الإشعارات"><Bell size={18} /><i /></button>
            <button className="admin-profile" type="button">
              <span className="admin-avatar">OG</span>
              <span className="admin-profile-copy"><strong>Omar Gad</strong><small>Super Admin</small></span>
              <ChevronDown size={15} />
            </button>
          </div>
        </header>

        <Outlet />
      </main>
    </div>
  );
}
