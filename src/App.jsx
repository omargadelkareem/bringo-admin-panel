import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "./layout/AdminLayout";
import Dashboard from "./pages/Dashboard";
import OrdersPage from "./pages/OrdersPage";
import ProductsPage from "./pages/ProductsPage";
import CategoriesPage from "./pages/CategoriesPage";
import BannersPage from "./pages/BannersPage";
import SettingsPage from "./pages/SettingsPage";
import DriversPage from "./pages/DriversPage";
import RestaurantsPage from "./pages/RestaurantsPage";
import RestaurantProductsPage from "./pages/RestaurantProductsPage";
import StoresPage from "./pages/RestaurantProductsPage";
import StoreProductsPage from "./pages/StoreProductsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AdminLayout />}>
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route
  path="restaurants/:restaurantId/products"
  element={<RestaurantProductsPage />}
/>
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="drivers" element={<DriversPage />} />
       <Route
  path="/stores"
  element={<StoresPage />}
/>

<Route
  path="/stores/:storeId/products"
  element={<StoreProductsPage />}
/>
        <Route path="banners" element={<BannersPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}