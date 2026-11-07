import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "./layout/AdminLayout";
import Dashboard from "./pages/Dashboard";
import OrdersPage from "./pages/OrdersPage";
import CategoriesPage from "./pages/CategoriesPage";
import BannersPage from "./pages/BannersPage";
import SettingsPage from "./pages/SettingsPage";
import DriversPage from "./pages/DriversPage";
import RestaurantProductsPage from "./pages/RestaurantProductsPage";
import StoresPage from "./pages/StoresPage";
import AddStorePage from "./pages/AddStorePage";
import StoreProductsPage from "./pages/StoreProductsPage";
import NotificationsPage from "./pages/NotificationsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AdminLayout />}>
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="products" element={<Navigate to="/stores" replace />} />
        <Route path="restaurants/:restaurantId/products" element={<RestaurantProductsPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="drivers" element={<DriversPage />} />
        <Route path="stores" element={<StoresPage />} />
        <Route path="stores/new" element={<AddStorePage />} />
        <Route path="stores/:storeId/edit" element={<AddStorePage />} />
        <Route path="stores/:storeId/products" element={<StoreProductsPage />} />
        <Route path="banners" element={<BannersPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
