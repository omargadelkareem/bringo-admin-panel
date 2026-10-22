import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function AdminLayout() {
  return (
    <div className="admin-layout">
      <Sidebar />

      <main className="main-content">
        <div className="topbar">
          <div>
            <h2>Bringo Dashboard</h2>
            <p>إدارة التطبيق والطلبات والمنتجات</p>
          </div>

          <div className="admin-badge">Admin</div>
        </div>

        <Outlet />
      </main>
    </div>
  );
}