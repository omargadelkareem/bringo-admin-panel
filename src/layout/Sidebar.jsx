import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Grid3X3,
  Image,
  Settings,
  Bike,
  Utensils,
} from "lucide-react";

const links = [
  { to: "/dashboard", label: "الرئيسية", icon: LayoutDashboard },
  { to: "/orders", label: "الطلبات", icon: ShoppingBag },
  { to: "/drivers", label: "الطيارين", icon: Bike },
  { to: "/products", label: "المنتجات", icon: Package },
  { to: "/categories", label: "الأقسام", icon: Grid3X3 },
  { to: "/stores", label: "المتاجر", icon: Utensils },
  { to: "/banners", label: "البانرات", icon: Image },
  { to: "/settings", label: "الإعدادات", icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-icon">B</div>
        <div>
          <h1>Bringo</h1>
          <span>Admin Panel</span>
        </div>
      </div>

      <nav>
        {links.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink key={item.to} to={item.to} className="nav-link">
              <Icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}