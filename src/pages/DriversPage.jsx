import { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";
import { ref, push, set, onValue, update, remove } from "firebase/database";

const emptyForm = {
  name: "",
  phone: "",
  code: "",
  isActive: true,
};

export default function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingKey, setEditingKey] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubDrivers = onValue(ref(db, "drivers"), (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([key, value]) => ({
        firebaseKey: key,
        ...value,
      }));

      list.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
      setDrivers(list);
    });

    const unsubOrders = onValue(ref(db, "orders"), (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([key, value]) => ({
        firebaseKey: key,
        ...value,
      }));

      list.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
      setOrders(list);
    });

    return () => {
      unsubDrivers();
      unsubOrders();
    };
  }, []);

  const stats = useMemo(() => {
    return {
      total: drivers.length,
      active: drivers.filter((d) => d.isActive !== false).length,
      available: drivers.filter((d) => d.isAvailable === true).length,
      completedProfile: drivers.filter((d) => d.profileCompleted === true).length,
    };
  }, [drivers]);

  const getDriverOrders = (driver) => {
    const driverId = driver?.id || driver?.firebaseKey;
    return orders.filter((order) => String(order.driverId || "") === String(driverId));
  };

  const generateCode = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setForm((prev) => ({ ...prev, code }));
  };

  const resetForm = () => {
    setEditingKey(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.phone.trim() || !form.code.trim()) {
      alert("اكتب رقم الهاتف وكود الدخول");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        code: form.code.trim(),
        isActive: Boolean(form.isActive),
        updatedAt: Date.now(),
      };

      if (editingKey) {
        await update(ref(db, `drivers/${editingKey}`), payload);
        resetForm();
        alert("تم تعديل الطيار");
        return;
      }

      const newRef = push(ref(db, "drivers"));
      const id = newRef.key;

      await set(newRef, {
        id,
        ...payload,
        profileCompleted: false,
        isAvailable: false,
        currentOrderId: "",
        personalImage: "",
        nationalId: "",
        nationalIdImage: "",
        licenseImage: "",
        vehicleImage: "",
        vehicleType: "",
        workHours: "",
        rating: 5,
        totalOrders: 0,
        createdAt: Date.now(),
      });

      resetForm();
      alert("تم إضافة الطيار بنجاح");
    } catch (error) {
      console.error(error);
      alert("حصل خطأ أثناء الحفظ");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (driver) => {
    setEditingKey(driver.firebaseKey);
    setForm({
      name: driver.name || "",
      phone: driver.phone || "",
      code: driver.code || "",
      isActive: driver.isActive !== false,
    });
  };

  const toggleActive = async (driver) => {
    await update(ref(db, `drivers/${driver.firebaseKey}`), {
      isActive: driver.isActive === false,
      updatedAt: Date.now(),
    });
  };

  const resetCode = async (driver) => {
    if (!confirm("هل تريد إنشاء كود جديد لهذا الطيار؟")) return;

    const newCode = Math.floor(1000 + Math.random() * 9000).toString();

    await update(ref(db, `drivers/${driver.firebaseKey}`), {
      code: newCode,
      updatedAt: Date.now(),
    });

    alert(`الكود الجديد: ${newCode}`);
  };

  const deleteDriver = async (key) => {
    if (!confirm("هل تريد حذف هذا الطيار؟")) return;
    await remove(ref(db, `drivers/${key}`));
  };

  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(Number(value));
    return date.toLocaleString("ar-EG");
  };

  const statusText = (status) => {
    const map = {
      pending: "معلق",
      confirmed: "مؤكد",
      assigned: "مقبول من الطيار",
      pickedUp: "تم الاستلام",
      onDelivery: "في الطريق",
      completed: "تم التسليم",
      cancelled: "ملغي",
    };

    return map[status] || status || "-";
  };

  const ImageBox = ({ title, src }) => (
    <div style={{ background: "#fff7fb", padding: 12, borderRadius: 16 }}>
      <strong>{title}</strong>
      <div style={{ marginTop: 10 }}>
        {src ? (
          <img
            src={src}
            alt={title}
            style={{
              width: "100%",
              height: 180,
              objectFit: "cover",
              borderRadius: 14,
              border: "1px solid #eee",
            }}
          />
        ) : (
          <div
            style={{
              height: 180,
              borderRadius: 14,
              background: "#ffeaf5",
              display: "grid",
              placeItems: "center",
              color: "#d20a82",
              fontWeight: 800,
            }}
          >
            لا توجد صورة
          </div>
        )}
      </div>
    </div>
  );

  const selectedDriverOrders = selectedDriver ? getDriverOrders(selectedDriver) : [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">إدارة الطيارين</h1>
          <p className="page-subtitle">
            أضف رقم وكود الطيار، وبعد أول دخول يكمل بياناته من التطبيق.
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "14px",
          marginBottom: "18px",
        }}
      >
        <div className="card" style={{ padding: 16 }}>
          <small>إجمالي الطيارين</small>
          <h2>{stats.total}</h2>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <small>النشطين</small>
          <h2>{stats.active}</h2>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <small>المتاحين الآن</small>
          <h2>{stats.available}</h2>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <small>مكتمل البيانات</small>
          <h2>{stats.completedProfile}</h2>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="form-grid">
          <input
            placeholder="اسم الطيار اختياري"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <input
            placeholder="رقم الهاتف"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />

          <input
            placeholder="كود الدخول"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />

          <button type="button" onClick={generateCode}>
            توليد كود
          </button>

          <select
            value={form.isActive ? "true" : "false"}
            onChange={(e) =>
              setForm({ ...form, isActive: e.target.value === "true" })
            }
          >
            <option value="true">نشط</option>
            <option value="false">موقوف</option>
          </select>

          <button type="submit" disabled={loading}>
            {loading ? "جاري الحفظ..." : editingKey ? "حفظ التعديل" : "إضافة طيار"}
          </button>

          {editingKey && (
            <button type="button" onClick={resetForm}>
              إلغاء التعديل
            </button>
          )}
        </form>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <table className="table">
          <thead>
            <tr>
              <th>الصورة</th>
              <th>الاسم</th>
              <th>الهاتف</th>
              <th>الكود</th>
              <th>التوثيق</th>
              <th>متاح</th>
              <th>نشط</th>
              <th>المركبة</th>
              <th>الطلبات</th>
              <th>تحكم</th>
            </tr>
          </thead>

          <tbody>
            {drivers.map((driver) => {
              const driverOrders = getDriverOrders(driver);

              return (
                <tr key={driver.firebaseKey}>
                  <td>
                    {driver.personalImage ? (
                      <img
                        className="category-img"
                        src={driver.personalImage}
                        alt={driver.name}
                      />
                    ) : (
                      "لا توجد"
                    )}
                  </td>

                  <td>
                    <strong>{driver.name || "لم يكمل الاسم"}</strong>
                    <br />
                    <small>{driver.workHours || "لا توجد مواعيد"}</small>
                  </td>

                  <td>{driver.phone || "-"}</td>
                  <td>
                    <strong>{driver.code || "-"}</strong>
                  </td>

                  <td>
                    {driver.profileCompleted ? (
                      <span className="badge">مكتمل</span>
                    ) : (
                      <span className="badge danger-badge">لم يكمل</span>
                    )}
                  </td>

                  <td>{driver.isAvailable ? "متاح" : "غير متاح"}</td>

                  <td>{driver.isActive === false ? "موقوف" : "نشط"}</td>

                  <td>{driver.vehicleType || "-"}</td>

                  <td>{driverOrders.length}</td>

                  <td>
                    <div className="actions">
                      <button onClick={() => setSelectedDriver(driver)}>
                        عرض البروفايل
                      </button>

                      <button onClick={() => startEdit(driver)}>تعديل</button>

                      <button onClick={() => resetCode(driver)}>كود جديد</button>

                      <button onClick={() => toggleActive(driver)}>
                        {driver.isActive === false ? "تفعيل" : "إيقاف"}
                      </button>

                      <button
                        className="danger"
                        onClick={() => deleteDriver(driver.firebaseKey)}
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {drivers.length === 0 && (
              <tr>
                <td colSpan="10">لا يوجد طيارين حتى الآن</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedDriver && (
        <div className="modal-overlay" onClick={() => setSelectedDriver(null)}>
          <div
            className="modal-card"
            style={{ maxWidth: 1100 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>بروفايل الطيار</h2>
              <button type="button" onClick={() => setSelectedDriver(null)}>
                ×
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 14,
                marginBottom: 20,
              }}
            >
              <div className="card" style={{ padding: 16, background: "#fff7fb" }}>
                <small>الاسم</small>
                <h3>{selectedDriver.name || "-"}</h3>
              </div>

              <div className="card" style={{ padding: 16, background: "#fff7fb" }}>
                <small>الهاتف</small>
                <h3>{selectedDriver.phone || "-"}</h3>
              </div>

              <div className="card" style={{ padding: 16, background: "#fff7fb" }}>
                <small>كود الدخول</small>
                <h3>{selectedDriver.code || "-"}</h3>
              </div>

              <div className="card" style={{ padding: 16, background: "#fff7fb" }}>
                <small>عدد الطلبات</small>
                <h3>{selectedDriverOrders.length}</h3>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 14,
                marginBottom: 20,
              }}
            >
              <div>
                <strong>رقم البطاقة:</strong> {selectedDriver.nationalId || "-"}
              </div>
              <div>
                <strong>نوع المركبة:</strong> {selectedDriver.vehicleType || "-"}
              </div>
              <div>
                <strong>مواعيد العمل:</strong> {selectedDriver.workHours || "-"}
              </div>
              <div>
                <strong>آخر ظهور:</strong> {formatDate(selectedDriver.lastSeenAt)}
              </div>
              <div>
                <strong>التقييم:</strong> {selectedDriver.rating || 5}
              </div>
              <div>
                <strong>الحالة:</strong>{" "}
                {selectedDriver.isActive === false ? "موقوف" : "نشط"}
              </div>
            </div>

            <h3 style={{ marginBottom: 12 }}>صور التوثيق</h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 14,
                marginBottom: 24,
              }}
            >
              <ImageBox title="الصورة الشخصية" src={selectedDriver.personalImage} />
              <ImageBox title="صورة البطاقة" src={selectedDriver.nationalIdImage} />
              <ImageBox title="صورة الرخصة" src={selectedDriver.licenseImage} />
              <ImageBox title="صورة المركبة" src={selectedDriver.vehicleImage} />
            </div>

            <h3 style={{ marginBottom: 12 }}>طلبات الطيار</h3>

            <table className="table">
              <thead>
                <tr>
                  <th>رقم الطلب</th>
                  <th>العميل</th>
                  <th>الهاتف</th>
                  <th>الإجمالي</th>
                  <th>الحالة</th>
                  <th>التاريخ</th>
                </tr>
              </thead>

              <tbody>
                {selectedDriverOrders.map((order) => (
                  <tr key={order.firebaseKey}>
                    <td>#{String(order.id || order.firebaseKey).slice(0, 6)}</td>
                    <td>{order.customerName || "-"}</td>
                    <td>{order.customerPhone || "-"}</td>
                    <td>{order.total || 0} جنيه</td>
                    <td>{statusText(order.orderStatus)}</td>
                    <td>{formatDate(order.createdAt)}</td>
                  </tr>
                ))}

                {selectedDriverOrders.length === 0 && (
                  <tr>
                    <td colSpan="6">لا توجد طلبات لهذا الطيار</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}