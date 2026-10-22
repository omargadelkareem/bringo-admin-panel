import { useEffect, useState } from "react";
import { db } from "../firebase";
import { ref, push, set, update, remove, onValue } from "firebase/database";

const emptyForm = {
  name: "",
  image: "",
  coverImage: "",
  phone: "",
  address: "",
  tags: "",
  rating: 4.5,
  deliveryTime: "25 - 35 دقيقة",
  minOrder: 0,
  sort: 1,
  isActive: true,
};

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingKey, setEditingKey] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = onValue(ref(db, "restaurants"), (snapshot) => {
      const data = snapshot.val() || {};

      const list = Object.entries(data).map(([key, value]) => ({
        firebaseKey: key,
        ...value,
      }));

      list.sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0));
      setRestaurants(list);
    });

    return () => unsub();
  }, []);

  const imageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      if (!file) return resolve("");

      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImage = async (e, key) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const base64 = await imageToBase64(file);

    setForm((prev) => ({
      ...prev,
      [key]: base64,
    }));
  };

  const resetForm = () => {
    setEditingKey(null);
    setForm({
      ...emptyForm,
      sort: restaurants.length + 1,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("اكتب اسم المطعم");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        name: form.name.trim(),
        image: form.image,
        coverImage: form.coverImage,
        phone: form.phone.trim(),
        address: form.address.trim(),
        tags: form.tags.trim(),
        rating: Number(form.rating || 4.5),
        deliveryTime: form.deliveryTime.trim(),
        minOrder: Number(form.minOrder || 0),
        sort: Number(form.sort || 1),
        isActive: Boolean(form.isActive),
        updatedAt: Date.now(),
      };

      if (editingKey) {
        await update(ref(db, `restaurants/${editingKey}`), payload);
        resetForm();
        return;
      }

      const newRef = push(ref(db, "restaurants"));
      const id = newRef.key;

      await set(newRef, {
        id,
        ...payload,
        createdAt: Date.now(),
      });

      resetForm();
    } catch (error) {
      console.error(error);
      alert("حصل خطأ أثناء حفظ المطعم");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (item) => {
    setEditingKey(item.firebaseKey);

    setForm({
      name: item.name || "",
      image: item.image || "",
      coverImage: item.coverImage || "",
      phone: item.phone || "",
      address: item.address || "",
      tags: item.tags || "",
      rating: item.rating || 4.5,
      deliveryTime: item.deliveryTime || "25 - 35 دقيقة",
      minOrder: item.minOrder || 0,
      sort: item.sort || 1,
      isActive: item.isActive !== false,
    });
  };

  const deleteRestaurant = async (key) => {
    if (!confirm("هل تريد حذف المطعم؟")) return;
    await remove(ref(db, `restaurants/${key}`));
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">إدارة المطاعم</h1>
          <p className="page-subtitle">
            إضافة المطاعم التي ستظهر داخل قسم المطاعم في التطبيق.
          </p>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="form-grid">
          <input
            placeholder="اسم المطعم"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <input
            placeholder="رقم الهاتف"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />

          <input
            placeholder="العنوان"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />

          <input
            placeholder="التصنيف مثل: بيتزا، برجر، شاورما"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
          />

          <input
            placeholder="وقت التوصيل"
            value={form.deliveryTime}
            onChange={(e) =>
              setForm({ ...form, deliveryTime: e.target.value })
            }
          />

          <input
            type="number"
            placeholder="الحد الأدنى للطلب"
            value={form.minOrder}
            onChange={(e) => setForm({ ...form, minOrder: e.target.value })}
          />

          <input
            type="number"
            step="0.1"
            placeholder="التقييم"
            value={form.rating}
            onChange={(e) => setForm({ ...form, rating: e.target.value })}
          />

          <input
            type="number"
            placeholder="الترتيب"
            value={form.sort}
            onChange={(e) => setForm({ ...form, sort: e.target.value })}
          />

          <select
            value={form.isActive ? "true" : "false"}
            onChange={(e) =>
              setForm({ ...form, isActive: e.target.value === "true" })
            }
          >
            <option value="true">ظاهر</option>
            <option value="false">مخفي</option>
          </select>

          <label className="file-label">
            صورة اللوجو
            <input type="file" accept="image/*" onChange={(e) => handleImage(e, "image")} />
          </label>

          <label className="file-label">
            صورة الغلاف
            <input type="file" accept="image/*" onChange={(e) => handleImage(e, "coverImage")} />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? "جاري الحفظ..." : editingKey ? "حفظ التعديل" : "إضافة مطعم"}
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
              <th>المطعم</th>
              <th>الهاتف</th>
              <th>العنوان</th>
              <th>التصنيف</th>
              <th>الحالة</th>
              <th>تحكم</th>
            </tr>
          </thead>

          <tbody>
            {restaurants.map((item) => (
              <tr key={item.firebaseKey}>
                <td>
                  {item.image ? (
                    <img className="category-img" src={item.image} alt={item.name} />
                  ) : (
                    "بدون صورة"
                  )}
                </td>
                <td>{item.name}</td>
                <td>{item.phone || "-"}</td>
                <td>{item.address || "-"}</td>
                <td>{item.tags || "-"}</td>
                <td>{item.isActive === false ? "مخفي" : "ظاهر"}</td>
                <td>
                  <div className="actions">
                    <button onClick={() => startEdit(item)}>تعديل</button>
                    <button
  onClick={() =>
    window.location.href = `/restaurants/${item.id || item.firebaseKey}/products`
  }
>
  إدارة المنيو
</button>
                    <button
                      className="danger"
                      onClick={() => deleteRestaurant(item.firebaseKey)}
                    >
                      حذف
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {restaurants.length === 0 && (
              <tr>
                <td colSpan="7">لا توجد مطاعم حتى الآن</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}