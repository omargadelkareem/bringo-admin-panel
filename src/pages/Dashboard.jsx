import { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [drivers, setDrivers] = useState([]);

  useEffect(() => {
    const unsubOrders = onValue(ref(db, "orders"), (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([key, value]) => ({
        firebaseKey: key,
        ...value,
      }));
      list.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
      setOrders(list);
    });

    const unsubProducts = onValue(ref(db, "products"), (snapshot) => {
      const data = snapshot.val() || {};
      setProducts(Object.values(data));
    });

    const unsubCategories = onValue(ref(db, "categories"), (snapshot) => {
      const data = snapshot.val() || {};
      setCategories(Object.values(data));
    });

    const unsubDrivers = onValue(ref(db, "drivers"), (snapshot) => {
      const data = snapshot.val() || {};
      setDrivers(Object.values(data));
    });

    return () => {
      unsubOrders();
      unsubProducts();
      unsubCategories();
      unsubDrivers();
    };
  }, []);

  const stats = useMemo(() => {
    const now = new Date();

    const isSameDay = (time) => {
      const d = new Date(Number(time || 0));
      return (
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    };

    const isThisWeek = (time) => {
      const d = new Date(Number(time || 0));
      const diff = now - d;
      return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
    };

    const isThisMonth = (time) => {
      const d = new Date(Number(time || 0));
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    };

    const completedOrders = orders.filter((o) => o.orderStatus === "completed");

    return {
      totalOrders: orders.length,
      todayOrders: orders.filter((o) => isSameDay(o.createdAt)).length,
      pendingOrders: orders.filter(
        (o) => !o.orderStatus || o.orderStatus === "pending" || o.orderStatus === "preparing"
      ).length,
      completedOrders: completedOrders.length,
      totalProducts: products.length,
      totalCategories: categories.length,
      totalDrivers: drivers.length,
      todaySales: completedOrders
        .filter((o) => isSameDay(o.createdAt))
        .reduce((sum, o) => sum + Number(o.total || 0), 0),
      weekSales: completedOrders
        .filter((o) => isThisWeek(o.createdAt))
        .reduce((sum, o) => sum + Number(o.total || 0), 0),
      monthSales: completedOrders
        .filter((o) => isThisMonth(o.createdAt))
        .reduce((sum, o) => sum + Number(o.total || 0), 0),
      totalRevenue: completedOrders.reduce((sum, o) => sum + Number(o.total || 0), 0),
    };
  }, [orders, products, categories, drivers]);

  const topProducts = useMemo(() => {
    const map = {};

    orders.forEach((order) => {
      const items = parseItems(order.items);

      items.forEach((item) => {
        const name = item.name || "منتج غير معروف";
        const qty = Number(item.quantity || 1);

        if (!map[name]) {
          map[name] = {
            name,
            quantity: 0,
            sales: 0,
          };
        }

        map[name].quantity += qty;
        map[name].sales += Number(item.price || 0) * qty;
      });
    });

    return Object.values(map)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 6);
  }, [orders]);

  const topCategories = useMemo(() => {
    const categoryMap = {};

    orders.forEach((order) => {
      const items = parseItems(order.items);

      items.forEach((item) => {
        const categoryId = item.categoryId || "unknown";
        const categoryName =
          categories.find((cat) => cat.id === categoryId)?.name || "غير محدد";

        if (!categoryMap[categoryId]) {
          categoryMap[categoryId] = {
            name: categoryName,
            count: 0,
          };
        }

        categoryMap[categoryId].count += Number(item.quantity || 1);
      });
    });

    return Object.values(categoryMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [orders, categories]);

  const latestOrders = orders.slice(0, 10);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">لوحة التحكم</h1>
          <p className="page-subtitle">نظرة حقيقية ومباشرة على أداء Bringo</p>
        </div>
      </div>

      <div className="grid stats-grid">
        <StatCard title="إجمالي الطلبات" value={stats.totalOrders} />
        <StatCard title="طلبات اليوم" value={stats.todayOrders} />
        <StatCard title="قيد التنفيذ" value={stats.pendingOrders} />
        <StatCard title="طلبات مكتملة" value={stats.completedOrders} />
        <StatCard title="إجمالي المنتجات" value={stats.totalProducts} />
        <StatCard title="الأقسام" value={stats.totalCategories} />
        <StatCard title="الطيارين" value={stats.totalDrivers} />
        <StatCard
          title="إجمالي الإيرادات"
          value={`${stats.totalRevenue.toLocaleString()} جنيه`}
          revenue
        />
      </div>

      <div className="grid stats-grid" style={{ marginTop: 22 }}>
        <StatCard title="مبيعات اليوم" value={`${stats.todaySales.toLocaleString()} جنيه`} />
        <StatCard title="مبيعات الأسبوع" value={`${stats.weekSales.toLocaleString()} جنيه`} />
        <StatCard title="مبيعات الشهر" value={`${stats.monthSales.toLocaleString()} جنيه`} />
      </div>

      <div className="dashboard-sections">
        <div className="card dashboard-table-card">
          <h2>آخر الطلبات</h2>

          <table className="table">
            <thead>
              <tr>
                <th>رقم الطلب</th>
                <th>العميل</th>
                <th>الهاتف</th>
                <th>الحالة</th>
                <th>الإجمالي</th>
              </tr>
            </thead>

            <tbody>
              {latestOrders.map((order) => (
                <tr key={order.firebaseKey}>
                  <td>#{String(order.id || order.firebaseKey).slice(0, 6)}</td>
                  <td>{order.customerName || "عميل Bringo"}</td>
                  <td>{order.customerPhone || "بدون رقم"}</td>
                  <td>{statusText(order.orderStatus)}</td>
                  <td>{Number(order.total || 0).toLocaleString()} جنيه</td>
                </tr>
              ))}

              {latestOrders.length === 0 && (
                <tr>
                  <td colSpan="5">لا توجد طلبات حتى الآن</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2>أكثر المنتجات طلبًا</h2>

          {topProducts.length === 0 ? (
            <p className="empty-text">لا توجد بيانات كافية</p>
          ) : (
            topProducts.map((item) => (
              <div className="rank-row" key={item.name}>
                <span>{item.quantity} قطعة</span>
                <strong>{item.name}</strong>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <h2>أكثر الأقسام طلبًا</h2>

          {topCategories.length === 0 ? (
            <p className="empty-text">لا توجد بيانات كافية</p>
          ) : (
            topCategories.map((item) => (
              <div className="rank-row" key={item.name}>
                <span>{item.count} طلب</span>
                <strong>{item.name}</strong>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, revenue = false }) {
  return (
    <div className={revenue ? "card stat-card revenue-card" : "card stat-card"}>
      <h3>{title}</h3>
      <strong>{value}</strong>
    </div>
  );
}

function parseItems(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "object") {
    return Object.values(value);
  }

  return [];
}

function statusText(status) {
  switch (status) {
    case "preparing":
      return "جاري التحضير";
    case "onDelivery":
      return "في الطريق";
    case "completed":
      return "مكتمل";
    case "cancelled":
      return "ملغي";
    case "pending":
    default:
      return "جديد";
  }
}