import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Grid3X3,
  Image,
  Settings,
  Bike,
  Store,
  Megaphone,
  ChevronLeft,
  CircleDot,
} from "lucide-react";

const groups = [
  {
    label: "التشغيل",
    links: [
      { to: "/dashboard", label: "مركز العمليات", icon: LayoutDashboard },
      { to: "/orders", label: "الطلبات", icon: ShoppingBag },
      { to: "/drivers", label: "الطيارين", icon: Bike },
    ],
  },
  {
    label: "الكتالوج والشركاء",
    links: [
      { to: "/products", label: "المنتجات", icon: Package },
      { to: "/categories", label: "الأقسام", icon: Grid3X3 },
      { to: "/stores", label: "المتاجر", icon: Store },
    ],
  },
  {
    label: "النمو والنظام",
    links: [
      { to: "/banners", label: "الحملات والبنرات", icon: Megaphone },
      { to: "/settings", label: "الإعدادات", icon: Settings },
    ],
  },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand-block">
        <div className="brand-mark"><span>B</span><i /></div>
        <div className="brand-copy">
          <h1>Bringo</h1>
          <span>Operations Center</span>
        </div>
      </div>

      <div className="sidebar-live">
        <span className="live-dot" />
        <div><strong>النظام يعمل</strong><small>Firebase متصل لحظيًا</small></div>
        <CircleDot size={15} />
      </div>

      <nav className="sidebar-nav">
        {groups.map((group) => (
          <div className="nav-group" key={group.label}>
            <div className="nav-group-label">{group.label}</div>
            {group.links.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.to} to={item.to} className="nav-link">
                  <span className="nav-icon"><Icon size={18} /></span>
                  <span className="nav-label">{item.label}</span>
                  <ChevronLeft className="nav-arrow" size={15} />
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-mark">B</div>
        <div><strong>Bringo Admin</strong><span>v1.0 • Sohag</span></div>
      </div>
    </aside>
  );
}
