import { useEffect, useState } from "react";
import { db } from "../firebase";
import { ref, push, set, onValue, remove, update } from "firebase/database";

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [editingKey, setEditingKey] = useState(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    image: "",
    sort: 1,
    isActive: true,
  });

  useEffect(() => {
    const categoriesRef = ref(db, "categories");

    const unsubscribe = onValue(categoriesRef, (snapshot) => {
      const data = snapshot.val() || {};

      const list = Object.entries(data).map(([key, value]) => ({
        firebaseKey: key,
        ...value,
      }));

      list.sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0));
      setCategories(list);
    });

    return () => unsubscribe();
  }, []);

  const resetForm = () => {
    setEditingKey(null);
    setForm({
      name: "",
      image: "",
      sort: categories.length + 1,
      isActive: true,
    });
  };

  const convertImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      if (!file) return reject("No file selected");

      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject("Failed to read file");

      reader.readAsDataURL(file);
    });
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("اختار صورة صحيحة");
      return;
    }

    const maxSizeMB = 5.5;
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`حجم الصورة كبير. اختار صورة أقل من ${maxSizeMB}MB`);
      return;
    }

    try {
      const base64 = await convertImageToBase64(file);
      setForm((prev) => ({
        ...prev,
        image: base64,
      }));
    } catch (error) {
      alert("تعذر قراءة الصورة");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("اكتب اسم القسم");
      return;
    }

    if (!form.image) {
      alert("اختار صورة للقسم");
      return;
    }

    try {
      setLoading(true);

      if (editingKey) {
        await update(ref(db, `categories/${editingKey}`), {
          name: form.name.trim(),
          image: form.image,
          sort: Number(form.sort || 1),
          isActive: Boolean(form.isActive),
          updatedAt: Date.now(),
        });

        resetForm();
        return;
      }

      const newRef = push(ref(db, "categories"));
      const id = newRef.key;

      await set(newRef, {
        id,
        name: form.name.trim(),
        image: form.image,
        sort: Number(form.sort || categories.length + 1),
        isActive: Boolean(form.isActive),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      resetForm();
    } catch (error) {
      console.error(error);
      alert("حصل خطأ أثناء حفظ القسم");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (cat) => {
    setEditingKey(cat.firebaseKey);

    setForm({
      name: cat.name || "",
      image: cat.image || "",
      sort: cat.sort || 1,
      isActive: cat.isActive !== false,
    });
  };

  const toggleActive = async (cat) => {
    await update(ref(db, `categories/${cat.firebaseKey}`), {
      isActive: cat.isActive === false,
      updatedAt: Date.now(),
    });
  };

  const deleteCategory = async (firebaseKey) => {
    if (!confirm("هل تريد حذف هذا القسم؟ المنتجات المرتبطة به لن تُحذف.")) {
      return;
    }

    await remove(ref(db, `categories/${firebaseKey}`));
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">إدارة الأقسام</h1>
          <p className="page-subtitle">
            أضف الأقسام التي ستظهر في تطبيق Bringo.
          </p>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="form-grid">
          <input
            placeholder="اسم القسم"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
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
            <option value="true">ظاهر في التطبيق</option>
            <option value="false">مخفي</option>
          </select>

          <button type="submit" disabled={loading}>
            {loading
              ? "جاري الحفظ..."
              : editingKey
              ? "حفظ التعديل"
              : "إضافة قسم"}
          </button>

          {editingKey && (
            <button type="button" onClick={resetForm}>
              إلغاء التعديل
            </button>
          )}
        </form>

        {form.image && (
          <div className="image-preview-box">
            <span>معاينة الصورة</span>
            <img src={form.image} alt="preview" />
          </div>
        )}

        <table className="table">
          <thead>
            <tr>
              <th>الصورة</th>
              <th>الاسم</th>
              <th>الترتيب</th>
              <th>الحالة</th>
              <th>تحكم</th>
            </tr>
          </thead>

          <tbody>
            {categories.map((cat) => (
              <tr key={cat.firebaseKey}>
                <td>
                  <img
                    className="category-img"
                    src={cat.image}
                    alt={cat.name}
                  />
                </td>
                <td>{cat.name}</td>
                <td>{cat.sort}</td>
                <td>
                  <span
                    className={
                      cat.isActive === false ? "badge danger-badge" : "badge"
                    }
                  >
                    {cat.isActive === false ? "مخفي" : "ظاهر"}
                  </span>
                </td>
                <td>
                  <div className="actions">
                    <button onClick={() => startEdit(cat)}>تعديل</button>

                    <button onClick={() => toggleActive(cat)}>
                      {cat.isActive === false ? "إظهار" : "إخفاء"}
                    </button>

                    <button
                      className="danger"
                      onClick={() => deleteCategory(cat.firebaseKey)}
                    >
                      حذف
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {categories.length === 0 && (
              <tr>
                <td colSpan="5">لا توجد أقسام حتى الآن</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}