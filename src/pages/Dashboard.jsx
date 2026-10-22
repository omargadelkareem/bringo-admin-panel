import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Bike,
  CheckCircle2,
  Clock3,
  CreditCard,
  Layers3,
  Package,
  ShoppingBag,
  Sparkles,
  TrendingUp,
} from "lucide-react";
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
      setProducts(Object.values(snapshot.val() || {}));
    });

    const unsubCategories = onValue(ref(db, "categories"), (snapshot) => {
      setCategories(Object.values(snapshot.val() || {}));
    });

    const unsubDrivers = onValue(ref(db, "drivers"), (snapshot) => {
      setDrivers(Object.values(snapshot.val() || {}));
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

    const completedOrders = orders.filter((o) => normalizeStatus(o) === "completed");
    const activeOrders = orders.filter((o) =>
      ["pending", "preparing", "confirmed", "assigned", "pickedUp", "onDelivery", "ready"].includes(
        normalizeStatus(o)
      )
    );

    return {
      totalOrders: orders.length,
      todayOrders: orders.filter((o) => isSameDay(o.createdAt)).length,
      activeOrders: activeOrders.length,
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
      parseItems(order.items).forEach((item) => {
        const name = item.name || "منتج غير معروف";
        const qty = Number(item.quantity || 1);
        if (!map[name]) map[name] = { name, quantity: 0, sales: 0 };
        map[name].quantity += qty;
        map[name].sales += Number(item.price || 0) * qty;
      });
    });

    return Object.values(map)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [orders]);

  const topCategories = useMemo(() => {
    const categoryMap = {};

    orders.forEach((order) => {
      parseItems(order.items).forEach((item) => {
        const categoryId = item.categoryId || "unknown";
        const categoryName =
          categories.find((cat) => cat.id === categoryId)?.name || "غير محدد";

        if (!categoryMap[categoryId]) {
          categoryMap[categoryId] = { name: categoryName, count: 0 };
        }

        categoryMap[categoryId].count += Number(item.quantity || 1);
      });
    });

    return Object.values(categoryMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [orders, categories]);

  const latestOrders = orders.slice(0, 8);

  return (
    <div className="dashboard-page" dir="rtl">
      <section className="dashboard-hero">
        <div>
          <div className="eyebrow"><Sparkles size={15} /> مركز عمليات Bringo</div>
          <h1>صباح الخير، جاهزين ندير اليوم؟</h1>
          <p>تابع الطلبات والمبيعات وأداء التشغيل من مكان واحد، ببيانات لحظية من Firebase.</p>
        </div>

        <div className="hero-revenue">
          <span>إجمالي الإيرادات</span>
          <strong>{stats.totalRevenue.toLocaleString()} جنيه</strong>
          <small><TrendingUp size={14} /> {stats.todayOrders} طلب اليوم</small>
        </div>
      </section>

      <section className="metrics-grid">
        <MetricCard icon={ShoppingBag} label="إجمالي الطلبات" value={stats.totalOrders} hint={`${stats.todayOrders} اليوم`} />
        <MetricCard icon={Clock3} label="طلبات نشطة" value={stats.activeOrders} hint="تحتاج متابعة" tone="warning" />
        <MetricCard icon={CheckCircle2} label="طلبات مكتملة" value={stats.completedOrders} hint="تم تسليمها" tone="success" />
        <MetricCard icon={CreditCard} label="مبيعات اليوم" value={`${stats.todaySales.toLocaleString()} ج`} hint="طلبات مكتملة" tone="money" />
      </section>

      <section className="operations-strip">
        <MiniStat icon={Package} label="المنتجات" value={stats.totalProducts} />
        <MiniStat icon={Layers3} label="الأقسام" value={stats.totalCategories} />
        <MiniStat icon={Bike} label="الطيارين" value={stats.totalDrivers} />
        <MiniStat icon={TrendingUp} label="مبيعات الأسبوع" value={`${stats.weekSales.toLocaleString()} ج`} />
        <MiniStat icon={CreditCard} label="مبيعات الشهر" value={`${stats.monthSales.toLocaleString()} ج`} />
      </section>

      <section className="dashboard-main-grid">
        <div className="panel panel-orders">
          <div className="panel-head">
            <div>
              <span className="section-kicker">LIVE OPERATIONS</span>
              <h2>آخر الطلبات</h2>
            </div>
            <a href="/orders" className="panel-link">كل الطلبات <ArrowUpRight size={15} /></a>
          </div>

          <div className="orders-list">
            {latestOrders.length === 0 ? (
              <div className="empty-state">لا توجد طلبات حتى الآن</div>
            ) : (
              latestOrders.map((order) => (
                <div className="order-row" key={order.firebaseKey}>
                  <div className="order-main">
                    <div className="order-avatar">{(order.customerName || "B").trim().charAt(0).toUpperCase()}</div>
                    <div>
                      <strong>{order.customerName || "عميل Bringo"}</strong>
                      <span>#{String(order.id || order.firebaseKey).slice(-6)}</span>
                    </div>
                  </div>

                  <div className="order-meta">
                    <span>{order.storeName || "متجر Bringo"}</span>
                    <b>{Number(order.total || 0).toLocaleString()} جنيه</b>
                  </div>

                  <StatusBadge status={normalizeStatus(order)} />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="dashboard-side-column">
          <div className="panel ranking-panel">
            <div className="panel-head compact">
              <div>
                <span className="section-kicker">TOP SELLERS</span>
                <h2>الأكثر طلبًا</h2>
              </div>
            </div>
            <RankingList items={topProducts} valueKey="quantity" suffix="قطعة" />
          </div>

          <div className="panel ranking-panel">
            <div className="panel-head compact">
              <div>
                <span className="section-kicker">CATEGORY MIX</span>
                <h2>الأقسام الأقوى</h2>
              </div>
            </div>
            <RankingList items={topCategories} valueKey="count" suffix="طلب" />
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, hint, tone = "default" }) {
  return (
    <article className={`metric-card tone-${tone}`}>
      <div className="metric-icon"><Icon size={21} /></div>
      <div className="metric-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{hint}</small>
      </div>
    </article>
  );
}

function MiniStat({ icon: Icon, label, value }) {
  return (
    <div className="mini-stat">
      <div className="mini-stat-icon"><Icon size={18} /></div>
      <div><span>{label}</span><strong>{value}</strong></div>
    </div>
  );
}

function RankingList({ items, valueKey, suffix }) {
  if (!items.length) return <div className="empty-state small">لا توجد بيانات كافية</div>;

  const max = Math.max(...items.map((item) => Number(item[valueKey] || 0)), 1);

  return (
    <div className="ranking-list">
      {items.map((item, index) => {
        const value = Number(item[valueKey] || 0);
        const width = `${Math.max(10, (value / max) * 100)}%`;

        return (
          <div className="ranking-item" key={`${item.name}-${index}`}>
            <div className="ranking-line">
              <strong>{item.name}</strong>
              <span>{value} {suffix}</span>
            </div>
            <div className="rank-track"><div style={{ width }} /></div>
          </div>
        );
      })}
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    pending: ["جديد", "status-new"],
    confirmed: ["تم القبول", "status-confirmed"],
    preparing: ["جاري التحضير", "status-preparing"],
    ready: ["جاهز", "status-ready"],
    assigned: ["تم تعيين طيار", "status-assigned"],
    pickedUp: ["استلمه الطيار", "status-assigned"],
    onDelivery: ["في الطريق", "status-delivery"],
    completed: ["مكتمل", "status-completed"],
    cancelled: ["ملغي", "status-cancelled"],
  };

  const [label, className] = config[status] || config.pending;
  return <span className={`status-pill ${className}`}>{label}</span>;
}

function normalizeStatus(order) {
  const raw = String(order?.orderStatus || order?.status || "pending")
    .replaceAll("_", "")
    .replaceAll("-", "")
    .toLowerCase();

  const aliases = {
    pendingprovider: "pending",
    new: "pending",
    accepted: "confirmed",
    confirmed: "confirmed",
    preparing: "preparing",
    ready: "ready",
    assigned: "assigned",
    picked: "pickedUp",
    pickedup: "pickedUp",
    way: "onDelivery",
    ondelivery: "onDelivery",
    delivered: "completed",
    done: "completed",
    completed: "completed",
    rejected: "cancelled",
    cancelled: "cancelled",
    canceled: "cancelled",
  };

  return aliases[raw] || raw || "pending";
}

function parseItems(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "object") return Object.values(value);
  return [];
}
