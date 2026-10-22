import { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";
import {
  ref,
  push,
  set,
  update,
  remove,
  onValue,
  get,
} from "firebase/database";
import { useNavigate } from "react-router-dom";

const storeTypes = {
  restaurant: {
    title: "المطاعم",
    singular: "مطعم",
    icon: "🍔",
    tagsPlaceholder: "التصنيف مثل: بيتزا، برجر، شاورما",
    defaultTags: "وجبات، مشروبات",
  },

  pharmacy: {
    title: "الصيدليات",
    singular: "صيدلية",
    icon: "💊",
    tagsPlaceholder: "مثل: أدوية، عناية شخصية، أم وطفل",
    defaultTags: "أدوية، عناية شخصية",
  },

  vegetables: {
    title: "الخضار والفاكهة",
    singular: "محل خضار وفاكهة",
    icon: "🥬",
    tagsPlaceholder: "مثل: خضروات، فواكه، ورقيات",
    defaultTags: "خضروات، فواكه",
  },

  supermarket: {
    title: "السوبر ماركت",
    singular: "سوبر ماركت",
    icon: "🛒",
    tagsPlaceholder: "مثل: بقالة، ألبان، منظفات، مشروبات",
    defaultTags: "بقالة، ألبان، منظفات، مشروبات",
  },

  beauty: {
    title: "مستحضرات التجميل",
    singular: "متجر مستحضرات تجميل",
    icon: "💄",
    tagsPlaceholder: "مثل: مكياج، عناية بالبشرة، عطور، عناية بالشعر",
    defaultTags: "مكياج، عناية بالبشرة، عطور",
  },

  meat: {
    title: "اللحوم والدواجن",
    singular: "متجر لحوم ودواجن",
    icon: "🥩",
    tagsPlaceholder: "مثل: لحوم، دواجن، مجمدات، طيور",
    defaultTags: "لحوم، دواجن، مجمدات",
  },

  bakery: {
    title: "المخابز والحلويات",
    singular: "مخبز أو محل حلويات",
    icon: "🍰",
    tagsPlaceholder: "مثل: مخبوزات، حلويات، تورت، معجنات",
    defaultTags: "مخبوزات، حلويات، معجنات",
  },

  fish: {
    title: "الأسماك والمأكولات البحرية",
    singular: "متجر أسماك",
    icon: "🐟",
    tagsPlaceholder: "مثل: أسماك، جمبري، مأكولات بحرية",
    defaultTags: "أسماك، مأكولات بحرية",
  },

  market: {
    title: "متاجر متنوعة",
    singular: "متجر",
    icon: "🛍️",
    tagsPlaceholder: "اكتب تصنيفات المتجر",
    defaultTags: "متجر متنوع",
  },
};

const createEmptyForm = (type = "restaurant") => ({
  name: "",
  type,
  image: "",
  coverImage: "",
  phone: "",
  address: "",
  tags: storeTypes[type]?.defaultTags || "",
  rating: 4.5,
  deliveryTime: "25 - 35 دقيقة",
  deliveryFee: 30,
  sort: 1,
  isOpen: true,
  isActive: true,
});

export default function StoresPage() {
  const navigate = useNavigate();

  const [stores, setStores] = useState([]);
  const [selectedType, setSelectedType] = useState("restaurant");

  const [form, setForm] = useState(
    createEmptyForm("restaurant")
  );

  const [editingKey, setEditingKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountStore, setAccountStore] = useState(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountForm, setAccountForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    isActive: true,
  });

  useEffect(() => {
    const storesRef = ref(db, "stores");

    const unsubscribe = onValue(
      storesRef,
      (snapshot) => {
        const data = snapshot.val() || {};

        const list = Object.entries(data).map(
          ([key, value]) => ({
            firebaseKey: key,
            ...value,
          })
        );

        list.sort(
          (a, b) =>
            Number(a.sort || 0) - Number(b.sort || 0)
        );

        setStores(list);
        setDataLoading(false);
      },
      (error) => {
        console.error("Stores loading error:", error);
        setDataLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const selectedTypeData =
    storeTypes[selectedType] || storeTypes.restaurant;

  const typeStores = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return stores.filter((store) => {
      const matchesType = store.type === selectedType;

      if (!matchesType) {
        return false;
      }

      if (!query) {
        return true;
      }

      const name = String(store.name || "").toLowerCase();
      const phone = String(store.phone || "").toLowerCase();
      const address = String(
        store.address || ""
      ).toLowerCase();
      const tags = String(store.tags || "").toLowerCase();

      return (
        name.includes(query) ||
        phone.includes(query) ||
        address.includes(query) ||
        tags.includes(query)
      );
    });
  }, [stores, selectedType, searchQuery]);

  const typeCounts = useMemo(() => {
    return Object.keys(storeTypes).reduce((counts, type) => {
      counts[type] = stores.filter(
        (store) => store.type === type
      ).length;

      return counts;
    }, {});
  }, [stores]);

  const imageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      if (!file) {
        resolve("");
        return;
      }

      const reader = new FileReader();

      reader.onload = () => {
        resolve(reader.result);
      };

      reader.onerror = () => {
        reject(new Error("تعذر قراءة الصورة"));
      };

      reader.readAsDataURL(file);
    });
  };

  const validateImage = (file) => {
    if (!file.type.startsWith("image/")) {
      alert("من فضلك اختر ملف صورة صحيح");
      return false;
    }

    const maxSizeInMB = 1.5;

    if (file.size > maxSizeInMB * 1024 * 1024) {
      alert(
        `حجم الصورة كبير، اختر صورة أقل من ${maxSizeInMB} ميجابايت`
      );

      return false;
    }

    return true;
  };

  const handleImage = async (event, key) => {
    const file = event.target.files?.[0];

    if (!file) return;
    if (!validateImage(file)) return;

    try {
      const base64 = await imageToBase64(file);

      setForm((previousForm) => ({
        ...previousForm,
        [key]: base64,
      }));
    } catch (error) {
      console.error(error);
      alert("تعذر تحميل الصورة");
    } finally {
      event.target.value = "";
    }
  };

  const resetForm = (type = selectedType) => {
    const count = stores.filter(
      (store) => store.type === type
    ).length;

    setEditingKey(null);

    setForm({
      ...createEmptyForm(type),
      sort: count + 1,
    });
  };

  const changeSelectedType = (type) => {
    setSelectedType(type);
    setSearchQuery("");
    setEditingKey(null);

    const count = stores.filter(
      (store) => store.type === type
    ).length;

    setForm({
      ...createEmptyForm(type),
      sort: count + 1,
    });
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      alert(`اكتب اسم ${selectedTypeData.singular}`);
      return false;
    }

    if (
      form.phone.trim() &&
      !/^[0-9+\s-]{7,20}$/.test(form.phone.trim())
    ) {
      alert("رقم الهاتف غير صحيح");
      return false;
    }

    const rating = Number(form.rating);

    if (
      Number.isNaN(rating) ||
      rating < 0 ||
      rating > 5
    ) {
      alert("التقييم يجب أن يكون بين 0 و5");
      return false;
    }

    if (Number(form.deliveryFee) < 0) {
      alert("رسوم التوصيل غير صحيحة");
      return false;
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const payload = {
        name: form.name.trim(),
        type: selectedType,

        image: form.image || "",
        coverImage: form.coverImage || "",

        phone: form.phone.trim(),
        address: form.address.trim(),
        tags: form.tags.trim(),

        rating: Number(form.rating || 4.5),
        deliveryTime:
          form.deliveryTime.trim() || "25 - 35 دقيقة",

        deliveryFee: Number(form.deliveryFee || 0),
        sort: Number(form.sort || 1),

        isOpen: Boolean(form.isOpen),
        isActive: Boolean(form.isActive),

        updatedAt: Date.now(),
      };

      if (editingKey) {
        await update(
          ref(db, `stores/${editingKey}`),
          payload
        );

        alert(`تم تعديل ${selectedTypeData.singular}`);
        resetForm();
        return;
      }

      const newStoreRef = push(ref(db, "stores"));
      const id = newStoreRef.key;

      await set(newStoreRef, {
        id,
        ...payload,
        createdAt: Date.now(),
      });

      alert(`تم إضافة ${selectedTypeData.singular}`);
      resetForm();
    } catch (error) {
      console.error("Save store error:", error);
      alert(
        `حدث خطأ أثناء حفظ ${selectedTypeData.singular}`
      );
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (item) => {
    setSelectedType(item.type || "restaurant");
    setEditingKey(item.firebaseKey);

    setForm({
      name: item.name || "",
      type: item.type || "restaurant",

      image: item.image || "",
      coverImage: item.coverImage || "",

      phone: item.phone || "",
      address: item.address || "",
      tags: item.tags || "",

      rating: item.rating ?? 4.5,
      deliveryTime:
        item.deliveryTime || "25 - 35 دقيقة",

      deliveryFee: item.deliveryFee ?? 30,
      sort: item.sort ?? 1,

      isOpen: item.isOpen !== false,
      isActive: item.isActive !== false,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const deleteStore = async (item) => {
    const itemType =
      storeTypes[item.type]?.singular || "المتجر";

    const confirmed = confirm(
      `هل تريد حذف ${itemType} "${item.name}"؟\nلن يتم حذف المنتجات المرتبطة به تلقائيًا.`
    );

    if (!confirmed) return;

    try {
      await remove(
        ref(db, `stores/${item.firebaseKey}`)
      );

      alert(`تم حذف ${itemType}`);
    } catch (error) {
      console.error("Delete store error:", error);
      alert("حدث خطأ أثناء الحذف");
    }
  };

  const toggleActive = async (item) => {
    try {
      await update(
        ref(db, `stores/${item.firebaseKey}`),
        {
          isActive: item.isActive === false,
          updatedAt: Date.now(),
        }
      );
    } catch (error) {
      console.error(error);
      alert("تعذر تغيير حالة الظهور");
    }
  };

  const toggleOpen = async (item) => {
    try {
      await update(
        ref(db, `stores/${item.firebaseKey}`),
        {
          isOpen: item.isOpen === false,
          updatedAt: Date.now(),
        }
      );
    } catch (error) {
      console.error(error);
      alert("تعذر تغيير حالة المتجر");
    }
  };

  const openProducts = (item) => {
    navigate(
      `/stores/${item.id || item.firebaseKey}/products`
    );
  };

  const openProviderAccount = async (item) => {
    try {
      setAccountLoading(true);
      setAccountStore(item);

      const storeId = item.id || item.firebaseKey;
      const snapshot = await get(ref(db, `providerUsers/${storeId}`));
      const existing = snapshot.val();

      setAccountForm({
        name: existing?.name || `مسؤول ${item.name}`,
        email: existing?.email || "",
        password: existing?.password || "",
        phone: existing?.phone || item.phone || "",
        isActive: existing?.isActive !== false,
      });

      setAccountModalOpen(true);
    } catch (error) {
      console.error("Load provider account error:", error);
      alert("تعذر تحميل بيانات حساب المتجر");
    } finally {
      setAccountLoading(false);
    }
  };

  const closeProviderAccount = () => {
    setAccountModalOpen(false);
    setAccountStore(null);
    setAccountForm({
      name: "",
      email: "",
      password: "",
      phone: "",
      isActive: true,
    });
  };

  const saveProviderAccount = async (event) => {
    event.preventDefault();

    if (!accountStore) return;

    const email = accountForm.email.trim().toLowerCase();
    const password = accountForm.password.trim();

    if (!email) {
      alert("اكتب البريد الإلكتروني");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert("البريد الإلكتروني غير صحيح");
      return;
    }

    if (password.length < 6) {
      alert("كلمة المرور يجب ألا تقل عن 6 أحرف أو أرقام");
      return;
    }

    try {
      setAccountLoading(true);

      const storeId = accountStore.id || accountStore.firebaseKey;
      const accountRef = ref(db, `providerUsers/${storeId}`);
      const oldSnapshot = await get(accountRef);
      const oldData = oldSnapshot.val();

      await set(accountRef, {
        id: storeId,
        storeId,
        storeName: accountStore.name || "",
        storeType: accountStore.type || "",
        name: accountForm.name.trim() || `مسؤول ${accountStore.name}`,
        email,
        password,
        phone: accountForm.phone.trim(),
        role: "store_owner",
        isActive: Boolean(accountForm.isActive),
        createdAt: oldData?.createdAt || Date.now(),
        updatedAt: Date.now(),
      });

      alert("تم حفظ بيانات دخول مقدم الخدمة بنجاح");
      closeProviderAccount();
    } catch (error) {
      console.error("Save provider account error:", error);
      alert("حدث خطأ أثناء حفظ حساب مقدم الخدمة");
    } finally {
      setAccountLoading(false);
    }
  };


  return (
    <div dir="rtl">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            إدارة المتاجر
          </h1>

          <p className="page-subtitle">
            إدارة جميع أنواع المتاجر ومقدمي الخدمة وإضافة المنتجات والحسابات الخاصة بكل متجر.
          </p>
        </div>
      </div>

      <div
        className="card"
        style={{
          marginBottom: 20,
          padding: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          {Object.entries(storeTypes).map(
            ([type, data]) => {
              const selected = selectedType === type;

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    changeSelectedType(type)
                  }
                  style={{
                    flex: "1 1 180px",
                    minHeight: 65,
                    padding: "12px 16px",
                    borderRadius: 16,
                    border: selected
                      ? "2px solid #e6007e"
                      : "1px solid #e9e9e9",

                    background: selected
                      ? "#fff0f7"
                      : "#ffffff",

                    color: selected
                      ? "#e6007e"
                      : "#222222",

                    cursor: "pointer",
                    fontSize: 15,
                    fontWeight: 800,
                  }}
                >
                  <span
                    style={{
                      fontSize: 22,
                      marginLeft: 8,
                    }}
                  >
                    {data.icon}
                  </span>

                  {data.title}

                  <span
                    style={{
                      marginRight: 8,
                      background: selected
                        ? "#e6007e"
                        : "#f1f1f1",

                      color: selected
                        ? "#ffffff"
                        : "#555555",

                      padding: "3px 9px",
                      borderRadius: 20,
                      fontSize: 12,
                    }}
                  >
                    {typeCounts[type] || 0}
                  </span>
                </button>
              );
            }
          )}
        </div>
      </div>

      <div className="card">
        <div
          style={{
            marginBottom: 20,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 20,
            }}
          >
            {editingKey
              ? `تعديل ${selectedTypeData.singular}`
              : `إضافة ${selectedTypeData.singular} جديد`}
          </h2>

          <p
            style={{
              color: "#777",
              marginTop: 7,
              marginBottom: 0,
            }}
          >
            أدخل بيانات {selectedTypeData.singular} والصور
            التي ستظهر للمستخدم داخل التطبيق.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="form-grid"
        >
          <input
            placeholder={`اسم ${selectedTypeData.singular}`}
            value={form.name}
            onChange={(event) =>
              setForm({
                ...form,
                name: event.target.value,
              })
            }
          />

          <input
            placeholder="رقم الهاتف"
            value={form.phone}
            onChange={(event) =>
              setForm({
                ...form,
                phone: event.target.value,
              })
            }
          />

          <input
            placeholder="العنوان"
            value={form.address}
            onChange={(event) =>
              setForm({
                ...form,
                address: event.target.value,
              })
            }
          />

          <input
            placeholder={
              selectedTypeData.tagsPlaceholder
            }
            value={form.tags}
            onChange={(event) =>
              setForm({
                ...form,
                tags: event.target.value,
              })
            }
          />

          <input
            placeholder="وقت التوصيل، مثال: 25 - 35 دقيقة"
            value={form.deliveryTime}
            onChange={(event) =>
              setForm({
                ...form,
                deliveryTime: event.target.value,
              })
            }
          />

          <input
            type="number"
            min="0"
            placeholder="رسوم التوصيل"
            value={form.deliveryFee}
            onChange={(event) =>
              setForm({
                ...form,
                deliveryFee: event.target.value,
              })
            }
          />

          <input
            type="number"
            min="0"
            max="5"
            step="0.1"
            placeholder="التقييم"
            value={form.rating}
            onChange={(event) =>
              setForm({
                ...form,
                rating: event.target.value,
              })
            }
          />

          <input
            type="number"
            min="1"
            placeholder="ترتيب الظهور"
            value={form.sort}
            onChange={(event) =>
              setForm({
                ...form,
                sort: event.target.value,
              })
            }
          />

          <select
            value={
              form.isOpen ? "true" : "false"
            }
            onChange={(event) =>
              setForm({
                ...form,
                isOpen:
                  event.target.value === "true",
              })
            }
          >
            <option value="true">
              مفتوح الآن
            </option>

            <option value="false">
              مغلق الآن
            </option>
          </select>

          <select
            value={
              form.isActive ? "true" : "false"
            }
            onChange={(event) =>
              setForm({
                ...form,
                isActive:
                  event.target.value === "true",
              })
            }
          >
            <option value="true">
              ظاهر في التطبيق
            </option>

            <option value="false">
              مخفي من التطبيق
            </option>
          </select>

          <label className="file-label">
            صورة اللوجو

            <input
              type="file"
              accept="image/*"
              onChange={(event) =>
                handleImage(event, "image")
              }
            />
          </label>

          <label className="file-label">
            صورة الغلاف

            <input
              type="file"
              accept="image/*"
              onChange={(event) =>
                handleImage(
                  event,
                  "coverImage"
                )
              }
            />
          </label>

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "جاري الحفظ..."
              : editingKey
              ? "حفظ التعديل"
              : `إضافة ${selectedTypeData.singular}`}
          </button>

          {editingKey && (
            <button
              type="button"
              onClick={() => resetForm()}
            >
              إلغاء التعديل
            </button>
          )}
        </form>

        {(form.image || form.coverImage) && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",

              gap: 16,
              marginTop: 20,
            }}
          >
            {form.image && (
              <div className="image-preview-box">
                <span>معاينة اللوجو</span>

                <img
                  src={form.image}
                  alt="معاينة اللوجو"
                  style={{
                    width: "100%",
                    maxHeight: 180,
                    objectFit: "cover",
                    borderRadius: 14,
                  }}
                />
              </div>
            )}

            {form.coverImage && (
              <div className="image-preview-box">
                <span>معاينة الغلاف</span>

                <img
                  src={form.coverImage}
                  alt="معاينة الغلاف"
                  style={{
                    width: "100%",
                    maxHeight: 180,
                    objectFit: "cover",
                    borderRadius: 14,
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div
        className="card"
        style={{
          marginTop: 20,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(220px, 1fr) auto",

            alignItems: "center",
            gap: 15,
            marginBottom: 20,
          }}
        >
          <input
            placeholder={`بحث داخل ${selectedTypeData.title}`}
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(event.target.value)
            }
          />

          <strong>
            {typeStores.length}{" "}
            {selectedTypeData.singular}
          </strong>
        </div>

        <div
          style={{
            overflowX: "auto",
          }}
        >
          <table className="table">
            <thead>
              <tr>
                <th>الصورة</th>
                <th>الاسم</th>
                <th>الهاتف</th>
                <th>العنوان</th>
                <th>التصنيف</th>
                <th>التوصيل</th>
                <th>حالة العمل</th>
                <th>الظهور</th>
                <th>تحكم</th>
              </tr>
            </thead>

            <tbody>
              {dataLoading && (
                <tr>
                  <td
                    colSpan="9"
                    style={{
                      textAlign: "center",
                    }}
                  >
                    جاري تحميل المتاجر...
                  </td>
                </tr>
              )}

              {!dataLoading &&
                typeStores.map((item) => (
                  <tr key={item.firebaseKey}>
                    <td>
                      {item.image ? (
                        <img
                          className="category-img"
                          src={item.image}
                          alt={item.name}
                          style={{
                            width: 60,
                            height: 60,
                            borderRadius: 14,
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 60,
                            height: 60,
                            display: "grid",
                            placeItems: "center",
                            borderRadius: 14,
                            background: "#fff0f7",
                            fontSize: 25,
                          }}
                        >
                          {
                            storeTypes[item.type]
                              ?.icon
                          }
                        </div>
                      )}
                    </td>

                    <td>
                      <strong>
                        {item.name}
                      </strong>

                      <br />

                      <small
                        style={{
                          color: "#888",
                        }}
                      >
                        الترتيب:{" "}
                        {item.sort || 1}
                      </small>
                    </td>

                    <td>
                      {item.phone || "-"}
                    </td>

                    <td>
                      {item.address || "-"}
                    </td>

                    <td>
                      {item.tags || "-"}
                    </td>

                    <td>
                      <strong>
                        {item.deliveryFee ?? 0} جنيه
                      </strong>

                      <br />

                      <small>
                        {item.deliveryTime ||
                          "غير محدد"}
                      </small>
                    </td>

                    <td>
                      <button
                        type="button"
                        onClick={() =>
                          toggleOpen(item)
                        }
                        style={{
                          border: 0,
                          cursor: "pointer",
                          borderRadius: 20,
                          padding: "7px 12px",

                          background:
                            item.isOpen === false
                              ? "#fff1f2"
                              : "#ecfdf3",

                          color:
                            item.isOpen === false
                              ? "#dc2626"
                              : "#15803d",

                          fontWeight: 800,
                        }}
                      >
                        {item.isOpen === false
                          ? "مغلق"
                          : "مفتوح"}
                      </button>
                    </td>

                    <td>
                      <button
                        type="button"
                        onClick={() =>
                          toggleActive(item)
                        }
                        style={{
                          border: 0,
                          cursor: "pointer",
                          borderRadius: 20,
                          padding: "7px 12px",

                          background:
                            item.isActive === false
                              ? "#f3f4f6"
                              : "#fff0f7",

                          color:
                            item.isActive === false
                              ? "#6b7280"
                              : "#e6007e",

                          fontWeight: 800,
                        }}
                      >
                        {item.isActive === false
                          ? "مخفي"
                          : "ظاهر"}
                      </button>
                    </td>

                    <td>
                      <div className="actions">
                        <button
                          type="button"
                          onClick={() =>
                            startEdit(item)
                          }
                        >
                          تعديل
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openProducts(item)
                          }
                        >
                          إدارة المنتجات
                        </button>


                        <button
                          type="button"
                          onClick={() =>
                            openProviderAccount(item)
                          }
                          disabled={accountLoading}
                        >
                          🔑 حساب المتجر
                        </button>

                        <button
                          type="button"
                          className="danger"
                          onClick={() =>
                            deleteStore(item)
                          }
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

              {!dataLoading &&
                typeStores.length === 0 && (
                  <tr>
                    <td
                      colSpan="9"
                      style={{
                        textAlign: "center",
                        padding: 35,
                      }}
                    >
                      لا توجد{" "}
                      {selectedTypeData.title} حتى
                      الآن
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      </div>

      {accountModalOpen && accountStore && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeProviderAccount();
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(17, 24, 39, 0.55)",
            display: "grid",
            placeItems: "center",
            padding: 18,
          }}
        >
          <form
            onSubmit={saveProviderAccount}
            style={{
              width: "min(520px, 100%)",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#ffffff",
              borderRadius: 22,
              padding: 24,
              boxShadow: "0 24px 70px rgba(0,0,0,.22)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 15,
                marginBottom: 20,
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>حساب مقدم الخدمة</h2>
                <p style={{ margin: "7px 0 0", color: "#777" }}>
                  بيانات دخول {accountStore.name}
                </p>
              </div>

              <button
                type="button"
                onClick={closeProviderAccount}
                style={{
                  border: 0,
                  background: "#f3f4f6",
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  cursor: "pointer",
                  fontSize: 20,
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gap: 14,
              }}
            >
              <label>
                <span style={{ display: "block", marginBottom: 7, fontWeight: 800 }}>
                  اسم المسؤول
                </span>
                <input
                  value={accountForm.name}
                  onChange={(event) =>
                    setAccountForm({ ...accountForm, name: event.target.value })
                  }
                  placeholder="مثال: أحمد محمد"
                  style={{ width: "100%" }}
                />
              </label>

              <label>
                <span style={{ display: "block", marginBottom: 7, fontWeight: 800 }}>
                  البريد الإلكتروني
                </span>
                <input
                  type="email"
                  value={accountForm.email}
                  onChange={(event) =>
                    setAccountForm({ ...accountForm, email: event.target.value })
                  }
                  placeholder="store@bringo.app"
                  autoComplete="off"
                  style={{ width: "100%" }}
                />
              </label>

              <label>
                <span style={{ display: "block", marginBottom: 7, fontWeight: 800 }}>
                  كلمة المرور
                </span>
                <input
                  type="text"
                  value={accountForm.password}
                  onChange={(event) =>
                    setAccountForm({ ...accountForm, password: event.target.value })
                  }
                  placeholder="6 أحرف أو أرقام على الأقل"
                  autoComplete="off"
                  style={{ width: "100%" }}
                />
              </label>

              <label>
                <span style={{ display: "block", marginBottom: 7, fontWeight: 800 }}>
                  رقم الهاتف
                </span>
                <input
                  value={accountForm.phone}
                  onChange={(event) =>
                    setAccountForm({ ...accountForm, phone: event.target.value })
                  }
                  placeholder="رقم هاتف المسؤول"
                  style={{ width: "100%" }}
                />
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "#fff0f7",
                  padding: 13,
                  borderRadius: 14,
                  fontWeight: 800,
                }}
              >
                <input
                  type="checkbox"
                  checked={accountForm.isActive}
                  onChange={(event) =>
                    setAccountForm({
                      ...accountForm,
                      isActive: event.target.checked,
                    })
                  }
                  style={{ width: 18, height: 18 }}
                />
                الحساب مفعل ويسمح له بالدخول
              </label>

              <div
                style={{
                  background: "#f9fafb",
                  border: "1px solid #eceff3",
                  borderRadius: 14,
                  padding: 13,
                  color: "#666",
                  fontSize: 13,
                  lineHeight: 1.8,
                }}
              >
                هذا تسجيل دخول تجريبي محفوظ في Realtime Database.
                لا تستخدمه في الإصدار النهائي قبل تفعيل نظام مصادقة آمن.
              </div>

              <button type="submit" disabled={accountLoading}>
                {accountLoading ? "جاري الحفظ..." : "حفظ بيانات الدخول"}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}