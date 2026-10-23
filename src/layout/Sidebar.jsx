import { NavLink } from "react-router-dom";
import { LayoutDashboard, ShoppingBag, Package, Grid3X3, Image, Settings, Bike, Store, ChevronLeft, Zap } from "lucide-react";

const groups = [
  { title: "التشغيل", items: [
    { to: "/dashboard", label: "مركز العمليات", icon: LayoutDashboard },
    { to: "/orders", label: "كل الطلبات", icon: ShoppingBag },
    { to: "/drivers", label: "الطيارين", icon: Bike },
  ]},
  { title: "إدارة المنصة", items: [
    { to: "/stores", label: "المتاجر والمطاعم", icon: Store },
    { to: "/products", label: "المنتجات", icon: Package },
    { to: "/categories", label: "الأقسام", icon: Grid3X3 },
  ]},
  { title: "التسويق والنظام", items: [
    { to: "/banners", label: "البانرات والعروض", icon: Image },
    { to: "/settings", label: "الإعدادات", icon: Settings },
  ]},
];

export default function Sidebar() {
  return (
    <aside className="sidebar bringo-sidebar">
      <div className="bringo-brand">
        <div className="bringo-mark"><Zap size={22} fill="currentColor" /></div>
        <div><h1>Bringo</h1><span>Operations Center</span></div>
      </div>
      <div className="sidebar-live"><i /> النظام متصل ويعمل</div>
      <nav className="bringo-nav">
        {groups.map((group) => (
          <div className="nav-group" key={group.title}>
            <div className="nav-group-title">{group.title}</div>
            {group.items.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                <span className="nav-icon"><Icon size={19} /></span><span>{label}</span><ChevronLeft className="nav-arrow" size={15} />
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer"><div className="admin-avatar">OG</div><div><strong>Omar Gad</strong><span>مدير النظام</span></div></div>
    </aside>
  );
}