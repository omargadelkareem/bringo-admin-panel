import { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";
import { ref, onValue, update } from "firebase/database";

const tabs = [
  { key: "pending", label: "جديدة" },
  { key: "preparing", label: "جاري التحضير" },
  { key: "onDelivery", label: "في الطريق" },
  { key: "completed", label: "مكتملة" },
  { key: "cancelled", label: "ملغية" },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedDriverId, setSelectedDriverId] = useState("");

  useEffect(() => {
    const ordersRef = ref(db, "orders");
    const driversRef = ref(db, "drivers");

    const unsubOrders = onValue(ordersRef, (snapshot) => {
      const data = snapshot.val() || {};

      const list = Object.entries(data).map(([key, value]) => ({
        firebaseKey: key,
        ...value,
      }));

      list.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
      setOrders(list);
    });

    const unsubDrivers = onValue(driversRef, (snapshot) => {
      const data = snapshot.val() || {};

      const list = Object.entries(data).map(([key, value]) => ({
        firebaseKey: key,
        ...value,
      }));

      setDrivers(list.filter((d) => d.isActive !== false));
    });

    return () => {
      unsubOrders();
      unsubDrivers();
    };
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const status = order.orderStatus || "pending";
      return status === activeTab;
    });
  }, [orders, activeTab]);

  const availableDrivers = drivers.filter((d) => d.isAvailable !== false);

  const updateOrderStatus = async (order, status) => {
    await update(ref(db, `orders/${order.firebaseKey}`), {
      orderStatus: status,
      updatedAt: Date.now(),
    });
  };

  const openAssignDialog = (order) => {
    setSelectedOrder(order);
    setSelectedDriverId(order.driverId || "");
  };

  const closeAssignDialog = () => {
    setSelectedOrder(null);
    setSelectedDriverId("");
  };

  const assignDriver = async () => {
    if (!selectedOrder || !selectedDriverId) {
      alert("اختار الطيار");
      return;
    }

    const driver = drivers.find((d) => d.id === selectedDriverId);

    await update(ref(db, `orders/${selectedOrder.firebaseKey}`), {
      driverId: driver.id,
      driverName: driver.name,
      driverPhone: driver.phone,
      orderStatus: "onDelivery",
      assignedAt: Date.now(),
      updatedAt: Date.now(),
    });

    closeAssignDialog();
  };

  const orderCounts = (status) =>
    orders.filter((o) => (o.orderStatus || "pending") === status).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">إدارة الطلبات</h1>
          <p className="page-subtitle">
            متابعة الطلبات الجديدة وتجهيزها وإسنادها للطيارين.
          </p>
        </div>
      </div>

      <div className="orders-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={activeTab === tab.key ? "tab-btn active-tab" : "tab-btn"}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            <span>{orderCounts(tab.key)}</span>
          </button>
        ))}
      </div>

      <div className="orders-grid">
        {filteredOrders.map((order) => (
          <OrderCard
            key={order.firebaseKey}
            order={order}
            onAccept={() => updateOrderStatus(order, "preparing")}
            onAssign={() => openAssignDialog(order)}
            onComplete={() => updateOrderStatus(order, "completed")}
            onCancel={() => updateOrderStatus(order, "cancelled")}
          />
        ))}

        {filteredOrders.length === 0 && (
          <div className="card empty-orders">لا توجد طلبات في هذا القسم</div>
        )}
      </div>

      {selectedOrder && (
        <div className="modal-overlay" onClick={closeAssignDialog}>
          <div className="modal-card small-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>إسناد الطلب لطيار</h2>
              <button onClick={closeAssignDialog}>×</button>
            </div>

            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
            >
              <option value="">اختر الطيار</option>
              {availableDrivers.map((driver) => (
                <option key={driver.firebaseKey} value={driver.id}>
                  {driver.name} - {driver.phone}
                </option>
              ))}
            </select>

            <button style={{ marginTop: 14 }} onClick={assignDriver}>
              إسناد الطلب
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, onAccept, onAssign, onComplete, onCancel }) {
  const items = parseItems(order.items);
  const address = order.address || {};

  return (
    <div className="order-card">
      <div className="order-card-header">
        <span className="badge">{statusText(order.orderStatus)}</span>
        <div>
          <h3>طلب #{String(order.id || order.firebaseKey).slice(0, 6)}</h3>
          <p>{formatDate(order.createdAt)}</p>
        </div>
      </div>

      <div className="customer-box">
        <strong>{order.customerName || "عميل Bringo"}</strong>
        <span>{order.customerPhone || "بدون رقم"}</span>
        <p>
          {address.area || ""} - {address.street || ""} - عمارة{" "}
          {address.building || ""}
        </p>
      </div>

      <div className="items-box">
        {items.map((item, index) => (
          <div className="order-item" key={index}>
            <span>x{item.quantity || 1}</span>
            <strong>{item.name}</strong>
            <em>{item.price} جنيه</em>
          </div>
        ))}
      </div>

      <div className="order-total">
        <span>الإجمالي</span>
        <strong>{Number(order.total || 0).toFixed(0)} جنيه</strong>
      </div>

      {order.driverName && (
        <div className="driver-box">
          <span>الطيار:</span>
          <strong>
            {order.driverName} - {order.driverPhone}
          </strong>
        </div>
      )}

      <div className="order-actions">
        {(order.orderStatus === "pending" || !order.orderStatus) && (
          <button onClick={onAccept}>قبول الطلب</button>
        )}

        {order.orderStatus === "preparing" && (
          <button onClick={onAssign}>إسناد لطيار</button>
        )}

        {order.orderStatus === "onDelivery" && (
          <button className="success-btn" onClick={onComplete}>
            تم التسليم
          </button>
        )}

        {order.orderStatus !== "completed" && order.orderStatus !== "cancelled" && (
          <button className="danger" onClick={onCancel}>
            إلغاء
          </button>
        )}
      </div>
    </div>
  );
}

function parseItems(value) {
  if (!value) return [];

  if (Array.isArray(value)) return value;

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
    default:
      return "طلب جديد";
  }
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(Number(value));
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} - ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
}