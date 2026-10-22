import { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";
import { ref, push, set, onValue, remove, update } from "firebase/database";
import Papa from "papaparse";
import * as XLSX from "xlsx";

const emptyForm = {
  name: "",
  brand: "",
  price: "",
  oldPrice: "",
  image: "",
  categoryId: "",
  categoryName: "",
  restaurantId: "",
  restaurantName: "",
  stock: "",
  unit: "قطعة",
  isAvailable: true,
  isBestSeller: false,
  isOffer: false,
};

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [restaurants, setRestaurants] = useState([]);

  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editingProduct, setEditingProduct] = useState(null);
  const [loading, setLoading] = useState(false);

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [bulkTargetCategory, setBulkTargetCategory] = useState("");

  useEffect(() => {
    const unsubProducts = onValue(ref(db, "products"), (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([key, value]) => ({
        firebaseKey: key,
        ...value,
      }));

      list.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
      setProducts(list);
    });

    const unsubCategories = onValue(ref(db, "categories"), (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([key, value]) => ({
        firebaseKey: key,
        ...value,
      }));

      list.sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0));

      const activeCategories = list.filter((cat) => cat.isActive !== false);
      setCategories(activeCategories);

      if (activeCategories.length > 0) {
        setForm((prev) => ({
          ...prev,
          categoryId: prev.categoryId || activeCategories[0].id || activeCategories[0].firebaseKey,
        }));
      }
    });

    const unsubRestaurants = onValue(ref(db, "restaurants"), (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([key, value]) => ({
        firebaseKey: key,
        ...value,
      }));

      list.sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0));
      setRestaurants(list);
    });

    return () => {
      unsubProducts();
      unsubCategories();
      unsubRestaurants();
    };
  }, []);

  const categoryOptions = useMemo(() => {
    return categories.map((cat) => ({
      id: cat.id || cat.firebaseKey,
      name: cat.name || "بدون اسم",
    }));
  }, [categories]);

  const restaurantOptions = useMemo(() => {
    return restaurants
      .filter((r) => r.isActive !== false)
      .map((r) => ({
        id: r.id || r.firebaseKey,
        firebaseKey: r.firebaseKey,
        name: r.name || "مطعم بدون اسم",
      }));
  }, [restaurants]);

  const normalizeText = (value) => {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[إأآا]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/\s+/g, " ");
  };

  const categoryName = (id) => {
    return categoryOptions.find((cat) => cat.id === id)?.name || "غير محدد";
  };

  const categoryExists = (id) => {
    return categoryOptions.some((cat) => cat.id === id);
  };

  const findCategoryId = (value) => {
    const clean = normalizeText(value);
    if (!clean) return "";

    const aliases = {
      "الالبان والجبن والبيض": "الالبان والجبن",
      "المطعم": "المطاعم",
      "مطاعم": "المطاعم",
      "restaurants": "restaurants",
    };

    const finalClean = aliases[clean] || clean;

    const found = categoryOptions.find((cat) => {
      const id = normalizeText(cat.id);
      const name = normalizeText(cat.name);
      return id === finalClean || name === finalClean;
    });

    return found?.id || "";
  };

  const findRestaurantByNameOrId = (value) => {
    const clean = normalizeText(value);
    if (!clean) return null;

    return restaurants.find((r) => {
      const id = normalizeText(r.id || r.firebaseKey);
      const name = normalizeText(r.name);
      return id === clean || name === clean;
    });
  };

  const resetAddForm = () => {
    setForm({
      ...emptyForm,
      categoryId: categoryOptions[0]?.id || "",
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

  const readValidImage = async (file) => {
    if (!file.type.startsWith("image/")) {
      alert("اختار صورة صحيحة");
      return null;
    }

    const maxSizeMB = 1.5;

    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`حجم الصورة كبير. اختار صورة أقل من ${maxSizeMB}MB`);
      return null;
    }

    try {
      return await convertImageToBase64(file);
    } catch (error) {
      alert("تعذر قراءة الصورة");
      return null;
    }
  };

  const handleAddImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const base64 = await readValidImage(file);
    if (!base64) return;

    setForm((prev) => ({ ...prev, image: base64 }));
  };

  const handleEditImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const base64 = await readValidImage(file);
    if (!base64) return;

    setEditForm((prev) => ({ ...prev, image: base64 }));
  };

  const buildProductPayload = (source) => {
    const selectedRestaurant = source.restaurantId
      ? findRestaurantByNameOrId(source.restaurantId)
      : null;

    const isRestaurantProduct = Boolean(selectedRestaurant);

    return {
      name: String(source.name || "").trim(),
      brand: String(source.brand || "").trim(),
      price: Number(source.price || 0),
      oldPrice: Number(source.oldPrice || 0),
      image: String(source.image || "").trim(),

      categoryId: isRestaurantProduct
        ? "restaurants"
        : String(source.categoryId || "").trim(),

      categoryName: isRestaurantProduct
        ? "المطاعم"
        : categoryName(String(source.categoryId || "").trim()),

      restaurantId: isRestaurantProduct
        ? selectedRestaurant.id || selectedRestaurant.firebaseKey
        : "",

      restaurantName: isRestaurantProduct ? selectedRestaurant.name || "" : "",

      stock: Number(source.stock || 0),
      unit: String(source.unit || "قطعة").trim(),
      isAvailable: source.isAvailable === true || source.isAvailable === "true",
      isBestSeller: source.isBestSeller === true || source.isBestSeller === "true",
      isOffer: source.isOffer === true || source.isOffer === "true",
      updatedAt: Date.now(),
    };
  };

  const validateProduct = (data) => {
    if (!data.name) {
      alert("اكتب اسم المنتج");
      return false;
    }

    if (!data.price || Number(data.price) <= 0) {
      alert("اكتب سعر صحيح للمنتج");
      return false;
    }

    if (!data.categoryId) {
      alert("اختار القسم");
      return false;
    }

    if (!categoryExists(data.categoryId)) {
      alert("القسم المختار غير موجود. تأكد أن عندك قسم المطاعم id بتاعه restaurants");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = buildProductPayload(form);

    if (!validateProduct(payload)) return;

    try {
      setLoading(true);

      const newRef = push(ref(db, "products"));

      await set(newRef, {
        id: newRef.key,
        ...payload,
        createdAt: Date.now(),
      });

      resetAddForm();
      alert("تم إضافة المنتج بنجاح");
    } catch (error) {
      console.error(error);
      alert("حصل خطأ أثناء حفظ المنتج");
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (product) => {
    setEditingProduct(product);

    setEditForm({
      name: product.name || "",
      brand: product.brand || "",
      price: product.price || "",
      oldPrice: product.oldPrice || "",
      image: product.image || "",
      categoryId: product.categoryId || "",
      categoryName: product.categoryName || "",
      restaurantId: product.restaurantId || "",
      restaurantName: product.restaurantName || "",
      stock: product.stock || "",
      unit: product.unit || "قطعة",
      isAvailable: product.isAvailable !== false,
      isBestSeller: product.isBestSeller === true,
      isOffer: product.isOffer === true,
    });
  };

  const closeEditDialog = () => {
    setEditingProduct(null);
    setEditForm(emptyForm);
  };

  const saveEditProduct = async (e) => {
    e.preventDefault();

    if (!editingProduct) return;

    const payload = buildProductPayload(editForm);

    if (!validateProduct(payload)) return;

    try {
      setLoading(true);

      await update(ref(db, `products/${editingProduct.firebaseKey}`), payload);

      closeEditDialog();
      alert("تم تعديل المنتج بنجاح");
    } catch (error) {
      console.error(error);
      alert("حصل خطأ أثناء تعديل المنتج");
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (firebaseKey) => {
    if (!confirm("هل تريد حذف هذا المنتج؟")) return;

    await remove(ref(db, `products/${firebaseKey}`));
    setSelectedProducts((prev) => prev.filter((id) => id !== firebaseKey));
  };

  const toggleAvailable = async (product) => {
    await update(ref(db, `products/${product.firebaseKey}`), {
      isAvailable: product.isAvailable === false,
      updatedAt: Date.now(),
    });
  };

  const deleteAllProducts = async () => {
    const confirmed = window.confirm(
      `⚠️ سيتم حذف ${products.length} منتج نهائياً من Firebase.\n\nهل أنت متأكد؟`
    );

    if (!confirmed) return;

    const secondConfirm = window.confirm(
      "تأكيد أخير: لا يمكن التراجع عن العملية."
    );

    if (!secondConfirm) return;

    try {
      setLoading(true);
      await remove(ref(db, "products"));
      setSelectedProducts([]);
      alert("✅ تم حذف جميع المنتجات بنجاح");
    } catch (error) {
      console.error(error);
      alert("❌ حدث خطأ أثناء الحذف");
    } finally {
      setLoading(false);
    }
  };

  const normalizeImportRow = (row) => {
    const get = (...keys) => {
      for (const key of keys) {
        if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
          return row[key];
        }
      }
      return "";
    };

    return {
      restaurantName: String(
        get("restaurantName", "اسم المطعم", "المطعم")
      ).trim(),
      restaurantId: String(get("restaurantId", "id المطعم")).trim(),

      name: String(get("name", "اسم المنتج", "productName")).trim(),
      brand: String(get("brand", "البراند", "الماركة")).trim(),
      price: get("price", "السعر"),
      oldPrice: get("oldPrice", "السعر قبل الخصم"),
      image: String(get("image", "الصورة")).trim(),

      categoryId: String(get("categoryId", "id القسم")).trim(),
      categoryName: String(
        get("categoryName", "category", "القسم", "اسم القسم")
      ).trim(),

      stock: get("stock", "الكمية"),
      unit: String(get("unit", "الوحدة")).trim() || "قطعة",
      isAvailable: get("isAvailable", "متاح"),
      isBestSeller: get("isBestSeller", "الأكثر طلبًا"),
      isOffer: get("isOffer", "عرض"),
    };
  };

  const parseBoolean = (value, defaultValue) => {
    if (value === "" || value === undefined || value === null) {
      return defaultValue;
    }

    const clean = String(value).trim().toLowerCase();

    return ["true", "yes", "1", "نعم", "متاح"].includes(clean);
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    try {
      setLoading(true);

      const extension = file.name.split(".").pop().toLowerCase();

      let rows = [];

      if (extension === "csv") {
        await new Promise((resolve) => {
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              rows = results.data || [];
              resolve();
            },
          });
        });
      } else if (extension === "xlsx" || extension === "xls") {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        rows = XLSX.utils.sheet_to_json(worksheet, {
          defval: "",
        });
      } else {
        alert("صيغة الملف غير مدعومة");
        return;
      }

      if (!rows.length) {
        alert("الملف فارغ");
        return;
      }

      let successCount = 0;
      let skippedCount = 0;

      const updates = {};
      const now = Date.now();

      rows.forEach((row) => {
        const item = normalizeImportRow(row);

        if (!item.name || !item.price) {
          skippedCount++;
          return;
        }

        const restaurant =
          findRestaurantByNameOrId(item.restaurantId) ||
          findRestaurantByNameOrId(item.restaurantName);

        let fixedCategoryId = "";
        let fixedCategoryName = "";
        let restaurantId = "";
        let restaurantName = "";

        if (item.restaurantName || item.restaurantId) {
          if (!restaurant) {
            skippedCount++;
            console.warn("مطعم غير معروف:", item.restaurantName || item.restaurantId, item.name);
            return;
          }

          fixedCategoryId = "restaurants";
          fixedCategoryName = "المطاعم";
          restaurantId = restaurant.id || restaurant.firebaseKey;
          restaurantName = restaurant.name || "";
        } else {
          fixedCategoryId =
            findCategoryId(item.categoryId) || findCategoryId(item.categoryName);

          if (!fixedCategoryId) {
            console.warn(
              "قسم غير معروف:",
              item.categoryName || item.categoryId,
              item.name
            );
            skippedCount++;
            return;
          }

          fixedCategoryName = categoryName(fixedCategoryId);
        }

        if (!categoryExists(fixedCategoryId)) {
          console.warn("القسم غير موجود في Firebase:", fixedCategoryId, item.name);
          skippedCount++;
          return;
        }

        const newKey = push(ref(db, "products")).key;

        updates[`products/${newKey}`] = {
          id: newKey,
          name: item.name,
          brand: item.brand || restaurantName || "",
          price: Number(item.price || 0),
          oldPrice: Number(item.oldPrice || 0),
          image: item.image,
          categoryId: fixedCategoryId,
          categoryName: fixedCategoryName,
          restaurantId,
          restaurantName,
          stock: Number(item.stock || 0),
          unit: item.unit || "قطعة",
          isAvailable: parseBoolean(item.isAvailable, true),
          isBestSeller: parseBoolean(item.isBestSeller, false),
          isOffer: parseBoolean(item.isOffer, false),
          createdAt: now,
          updatedAt: now,
        };

        successCount++;
      });

      if (Object.keys(updates).length) {
        await update(ref(db), updates);
      }

      alert(
        `تم استيراد ${successCount} منتج بنجاح. تم تجاهل ${skippedCount} صف.`
      );
    } catch (error) {
      console.error(error);
      alert("حصل خطأ أثناء الاستيراد");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  const guessCategoryId = (product) => {
    const text = `${product.name || ""} ${product.brand || ""}`.toLowerCase();

    const rules = [
      {
        category: "dairy",
        words: ["لبن", "حليب", "جبن", "جبنة", "زبادي", "زبادى", "قشطة", "رايب"],
      },
      {
        category: "bakery",
        words: ["عيش", "خبز", "توست", "كرواسون", "باتيه", "كيك", "بسكويت"],
      },
      {
        category: "grocery",
        words: ["أرز", "ارز", "سكر", "زيت", "مكرونة", "شاي", "شاى", "دقيق", "ملح"],
      },
      {
        category: "fruits",
        words: ["تفاح", "موز", "برتقال", "خيار", "طماطم", "بطاطس", "بصل", "ليمون"],
      },
      {
        category: "cleaning",
        words: ["منظف", "مسحوق", "كلور", "كلوركس", "صابون", "فيري", "برسيل", "تايد"],
      },
      {
        category: "spices",
        words: ["كمون", "كزبرة", "فلفل", "شطة", "قرفة", "ينسون", "حلبة"],
      },
      {
        category: "honey",
        words: ["عسل"],
      },
      {
        category: "pickles",
        words: ["مخلل", "زيتون", "طرشي"],
      },
      {
        category: "pharmacy",
        words: ["بنادول", "دواء", "مسكن", "فيتامين", "مطهر", "كريم"],
      },
      {
        category: "fast_food",
        words: ["برجر", "بيتزا", "شاورما", "ساندوتش", "وجبة", "بطاطس مقلية"],
      },
    ];

    for (const rule of rules) {
      if (rule.words.some((word) => text.includes(word))) {
        const foundCategory = categoryOptions.find(
          (cat) => cat.id === rule.category
        );

        if (foundCategory) return foundCategory.id;
      }
    }

    return "";
  };

  const fixProductsCategories = async () => {
    if (!confirm("هل تريد إصلاح أقسام المنتجات تلقائيًا؟")) return;

    try {
      setLoading(true);

      const updates = {};
      let fixedCount = 0;

      products.forEach((product) => {
        const exists = categoryExists(product.categoryId);

        if (!exists) {
          const fixedCategoryId =
            findCategoryId(product.categoryId) || guessCategoryId(product);

          if (fixedCategoryId) {
            updates[`products/${product.firebaseKey}/categoryId`] = fixedCategoryId;
            updates[`products/${product.firebaseKey}/categoryName`] =
              categoryName(fixedCategoryId);
            updates[`products/${product.firebaseKey}/updatedAt`] = Date.now();
            fixedCount++;
          }
        }
      });

      if (fixedCount === 0) {
        alert("لا توجد منتجات تحتاج إصلاح");
        return;
      }

      await update(ref(db), updates);

      alert(`تم إصلاح ${fixedCount} منتج بنجاح`);
    } catch (error) {
      console.error(error);
      alert("حصل خطأ أثناء إصلاح الأقسام");
    } finally {
      setLoading(false);
    }
  };

  const deleteProductsWithoutCategory = async () => {
    if (!confirm("هل تريد حذف كل المنتجات غير المرتبطة بقسم صحيح؟")) return;

    try {
      setLoading(true);

      const updates = {};
      let deletedCount = 0;

      products.forEach((product) => {
        if (!categoryExists(product.categoryId)) {
          updates[`products/${product.firebaseKey}`] = null;
          deletedCount++;
        }
      });

      if (deletedCount === 0) {
        alert("لا توجد منتجات غير مرتبطة بقسم");
        return;
      }

      await update(ref(db), updates);

      alert(`تم حذف ${deletedCount} منتج`);
    } catch (error) {
      console.error(error);
      alert("حصل خطأ أثناء حذف المنتجات");
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory =
        selectedCategoryFilter === "all" ||
        product.categoryId === selectedCategoryFilter;

      const q = searchQuery.trim().toLowerCase();

      const productName = String(product.name || "").toLowerCase();
      const productBrand = String(product.brand || "").toLowerCase();
      const productCategory = String(categoryName(product.categoryId) || "").toLowerCase();
      const restaurantName = String(product.restaurantName || "").toLowerCase();

      const matchesSearch =
        !q ||
        productName.includes(q) ||
        productBrand.includes(q) ||
        productCategory.includes(q) ||
        restaurantName.includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategoryFilter, searchQuery, categoryOptions]);

  const stats = useMemo(() => {
    const totalCount = filteredProducts.length;

    const totalStock = filteredProducts.reduce((sum, product) => {
      return sum + Number(product.stock || 0);
    }, 0);

    const totalValue = filteredProducts.reduce((sum, product) => {
      return sum + Number(product.price || 0) * Number(product.stock || 0);
    }, 0);

    const availableCount = filteredProducts.filter(
      (product) => product.isAvailable !== false
    ).length;

    const selectedValue = products
      .filter((product) => selectedProducts.includes(product.firebaseKey))
      .reduce((sum, product) => {
        return sum + Number(product.price || 0) * Number(product.stock || 0);
      }, 0);

    return {
      totalCount,
      totalStock,
      totalValue,
      availableCount,
      selectedValue,
    };
  }, [filteredProducts, selectedProducts, products]);

  const toggleSelectProduct = (firebaseKey) => {
    setSelectedProducts((prev) =>
      prev.includes(firebaseKey)
        ? prev.filter((id) => id !== firebaseKey)
        : [...prev, firebaseKey]
    );
  };

  const toggleSelectAll = () => {
    const visibleIds = filteredProducts.map((product) => product.firebaseKey);

    const allSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) => selectedProducts.includes(id));

    if (allSelected) {
      setSelectedProducts((prev) =>
        prev.filter((id) => !visibleIds.includes(id))
      );
    } else {
      setSelectedProducts((prev) => [...new Set([...prev, ...visibleIds])]);
    }
  };

  const clearSelection = () => {
    setSelectedProducts([]);
    setBulkTargetCategory("");
  };

  const moveSelectedProducts = async () => {
    if (!selectedProducts.length) {
      alert("اختار منتجات أولاً");
      return;
    }

    if (!bulkTargetCategory) {
      alert("اختار القسم الجديد");
      return;
    }

    if (
      !confirm(
        `سيتم نقل ${selectedProducts.length} منتج إلى قسم ${categoryName(
          bulkTargetCategory
        )}`
      )
    ) {
      return;
    }

    try {
      setLoading(true);

      const updates = {};

      selectedProducts.forEach((key) => {
        updates[`products/${key}/categoryId`] = bulkTargetCategory;
        updates[`products/${key}/categoryName`] = categoryName(bulkTargetCategory);

        if (bulkTargetCategory !== "restaurants") {
          updates[`products/${key}/restaurantId`] = "";
          updates[`products/${key}/restaurantName`] = "";
        }

        updates[`products/${key}/updatedAt`] = Date.now();
      });

      await update(ref(db), updates);

      clearSelection();
      alert("تم نقل المنتجات بنجاح");
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء نقل المنتجات");
    } finally {
      setLoading(false);
    }
  };

  const deleteSelectedProducts = async () => {
    if (!selectedProducts.length) {
      alert("اختار منتجات أولاً");
      return;
    }

    if (!confirm(`هل تريد حذف ${selectedProducts.length} منتج؟`)) return;

    try {
      setLoading(true);

      const updates = {};

      selectedProducts.forEach((key) => {
        updates[`products/${key}`] = null;
      });

      await update(ref(db), updates);

      clearSelection();
      alert("تم حذف المنتجات المحددة");
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء حذف المنتجات المحددة");
    } finally {
      setLoading(false);
    }
  };

  const brokenProductsCount = products.filter(
    (product) => !categoryExists(product.categoryId)
  ).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">إدارة المنتجات</h1>
          <p className="page-subtitle">
            أضف المنتجات واربط كل منتج بالقسم أو المطعم المناسب.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="products-toolbar">
          <button
            type="button"
            className="danger"
            onClick={deleteAllProducts}
            disabled={loading || products.length === 0}
          >
            حذف جميع المنتجات ({products.length})
          </button>

          <label className="import-btn">
            استيراد Excel / CSV
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              hidden
              onChange={handleImportFile}
            />
          </label>

          <button
            type="button"
            className="success-btn"
            onClick={fixProductsCategories}
            disabled={loading}
          >
            إصلاح أقسام المنتجات
          </button>

          <button
            type="button"
            className="danger"
            onClick={deleteProductsWithoutCategory}
            disabled={loading}
          >
            حذف غير المرتبط بقسم
          </button>

          {brokenProductsCount > 0 && (
            <span className="warning-pill">
              {brokenProductsCount} منتج غير محدد القسم
            </span>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "14px",
            marginBottom: "18px",
          }}
        >
          <div className="card" style={{ padding: 16, background: "#fff7fb" }}>
            <small>عدد المنتجات المعروضة</small>
            <h2>{stats.totalCount}</h2>
          </div>

          <div className="card" style={{ padding: 16, background: "#fff7fb" }}>
            <small>إجمالي الكمية</small>
            <h2>{stats.totalStock.toLocaleString()}</h2>
          </div>

          <div
            className="card"
            style={{
              padding: 16,
              color: "white",
              background: "linear-gradient(135deg, #ff4fa3, #d20a82)",
            }}
          >
            <small>قيمة المخزون</small>
            <h2>{stats.totalValue.toLocaleString()} جنيه</h2>
          </div>

          <div className="card" style={{ padding: 16, background: "#fff7fb" }}>
            <small>المنتجات المحددة</small>
            <h2>{selectedProducts.length}</h2>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr 1fr auto auto",
            gap: "12px",
            marginBottom: "18px",
            alignItems: "center",
          }}
        >
          <input
            placeholder="بحث باسم المنتج أو البراند أو القسم أو المطعم"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
          >
            <option value="all">كل الأقسام</option>
            {categoryOptions.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            value={bulkTargetCategory}
            onChange={(e) => setBulkTargetCategory(e.target.value)}
          >
            <option value="">نقل المحدد إلى قسم</option>
            {categoryOptions.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="success-btn"
            onClick={moveSelectedProducts}
            disabled={loading || selectedProducts.length === 0}
          >
            نقل المحدد
          </button>

          <button
            type="button"
            className="danger"
            onClick={deleteSelectedProducts}
            disabled={loading || selectedProducts.length === 0}
          >
            حذف المحدد
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form-grid">
          <input
            placeholder="اسم المنتج"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <input
            placeholder="البراند / المصدر"
            value={form.brand}
            onChange={(e) => setForm({ ...form, brand: e.target.value })}
          />

          <select
            value={form.categoryId}
            onChange={(e) =>
              setForm({
                ...form,
                categoryId: e.target.value,
                restaurantId: e.target.value === "restaurants" ? form.restaurantId : "",
              })
            }
          >
            <option value="">اختر القسم</option>
            {categoryOptions.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            value={form.restaurantId}
            onChange={(e) => {
              const restaurant = findRestaurantByNameOrId(e.target.value);
              setForm({
                ...form,
                restaurantId: e.target.value,
                restaurantName: restaurant?.name || "",
                categoryId: e.target.value ? "restaurants" : form.categoryId,
              });
            }}
          >
            <option value="">بدون مطعم</option>
            {restaurantOptions.map((restaurant) => (
              <option key={restaurant.id} value={restaurant.id}>
                {restaurant.name}
              </option>
            ))}
          </select>

          <input
            type="number"
            placeholder="السعر"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />

          <input
            type="number"
            placeholder="السعر قبل الخصم"
            value={form.oldPrice}
            onChange={(e) => setForm({ ...form, oldPrice: e.target.value })}
          />

          <input
            type="number"
            placeholder="الكمية"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })}
          />

          <select
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
          >
            <option value="قطعة">قطعة</option>
            <option value="كيلو">كيلو</option>
            <option value="جرام">جرام</option>
            <option value="لتر">لتر</option>
            <option value="عبوة">عبوة</option>
            <option value="كرتونة">كرتونة</option>
            <option value="علبة">علبة</option>
            <option value="وجبة">وجبة</option>
          </select>

          <input type="file" accept="image/*" onChange={handleAddImageChange} />

          <select
            value={form.isAvailable ? "true" : "false"}
            onChange={(e) =>
              setForm({ ...form, isAvailable: e.target.value === "true" })
            }
          >
            <option value="true">متاح</option>
            <option value="false">غير متاح</option>
          </select>

          <select
            value={form.isBestSeller ? "true" : "false"}
            onChange={(e) =>
              setForm({ ...form, isBestSeller: e.target.value === "true" })
            }
          >
            <option value="false">ليس الأكثر طلبًا</option>
            <option value="true">الأكثر طلبًا</option>
          </select>

          <select
            value={form.isOffer ? "true" : "false"}
            onChange={(e) =>
              setForm({ ...form, isOffer: e.target.value === "true" })
            }
          >
            <option value="false">ليس عرض</option>
            <option value="true">عرض</option>
          </select>

          <button type="submit" disabled={loading}>
            {loading ? "جاري الحفظ..." : "إضافة منتج"}
          </button>
        </form>

        {form.image && (
          <div className="image-preview-box">
            <span>معاينة صورة المنتج</span>
            <img src={form.image} alt="preview" />
          </div>
        )}

        <table className="table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={
                    filteredProducts.length > 0 &&
                    filteredProducts.every((product) =>
                      selectedProducts.includes(product.firebaseKey)
                    )
                  }
                  onChange={toggleSelectAll}
                />
              </th>
              <th>الصورة</th>
              <th>المنتج</th>
              <th>القسم</th>
              <th>المطعم</th>
              <th>السعر</th>
              <th>الكمية</th>
              <th>الحالة</th>
              <th>وسوم</th>
              <th>تحكم</th>
            </tr>
          </thead>

          <tbody>
            {filteredProducts.map((product) => {
              const broken = !categoryExists(product.categoryId);

              return (
                <tr
                  key={product.firebaseKey}
                  style={{
                    background: broken ? "#fff1f2" : "transparent",
                  }}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.firebaseKey)}
                      onChange={() => toggleSelectProduct(product.firebaseKey)}
                    />
                  </td>

                  <td>
                    <img
                      className="product-img"
                      src={product.image || ""}
                      alt={product.name}
                    />
                  </td>

                  <td>
                    <strong>{product.name}</strong>
                    <br />
                    <small>{product.brand || "بدون براند"}</small>
                  </td>

                  <td>
                    {broken ? (
                      <span className="danger-text">غير محدد</span>
                    ) : (
                      categoryName(product.categoryId)
                    )}
                  </td>

                  <td>{product.restaurantName || "-"}</td>

                  <td>
                    {product.price} جنيه
                    {Number(product.oldPrice || 0) > 0 && (
                      <>
                        <br />
                        <small style={{ textDecoration: "line-through" }}>
                          {product.oldPrice} جنيه
                        </small>
                      </>
                    )}
                  </td>

                  <td>
                    {product.stock || 0} {product.unit || "قطعة"}
                  </td>

                  <td>
                    <span
                      className={
                        product.isAvailable === false
                          ? "badge danger-badge"
                          : "badge"
                      }
                    >
                      {product.isAvailable === false ? "غير متاح" : "متاح"}
                    </span>
                  </td>

                  <td>
                    {product.isBestSeller && <span>🔥 الأكثر طلبًا </span>}
                    {product.isOffer && <span> 💖 عرض </span>}
                  </td>

                  <td>
                    <div className="actions">
                      <button onClick={() => openEditDialog(product)}>
                        تعديل
                      </button>

                      <button onClick={() => toggleAvailable(product)}>
                        {product.isAvailable === false ? "إتاحة" : "إخفاء"}
                      </button>

                      <button
                        className="danger"
                        onClick={() => deleteProduct(product.firebaseKey)}
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan="10">لا توجد منتجات مطابقة</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingProduct && (
        <div className="modal-overlay" onClick={closeEditDialog}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>تعديل المنتج</h2>
              <button type="button" onClick={closeEditDialog}>
                ×
              </button>
            </div>

            <form onSubmit={saveEditProduct} className="form-grid modal-form">
              <input
                placeholder="اسم المنتج"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
              />

              <input
                placeholder="البراند / المصدر"
                value={editForm.brand}
                onChange={(e) =>
                  setEditForm({ ...editForm, brand: e.target.value })
                }
              />

              <select
                value={editForm.categoryId}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    categoryId: e.target.value,
                    restaurantId:
                      e.target.value === "restaurants"
                        ? editForm.restaurantId
                        : "",
                    restaurantName:
                      e.target.value === "restaurants"
                        ? editForm.restaurantName
                        : "",
                  })
                }
              >
                <option value="">اختر القسم</option>
                {categoryOptions.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>

              <select
                value={editForm.restaurantId}
                onChange={(e) => {
                  const restaurant = findRestaurantByNameOrId(e.target.value);

                  setEditForm({
                    ...editForm,
                    restaurantId: e.target.value,
                    restaurantName: restaurant?.name || "",
                    categoryId: e.target.value ? "restaurants" : editForm.categoryId,
                  });
                }}
              >
                <option value="">بدون مطعم</option>
                {restaurantOptions.map((restaurant) => (
                  <option key={restaurant.id} value={restaurant.id}>
                    {restaurant.name}
                  </option>
                ))}
              </select>

              <input
                type="number"
                placeholder="السعر"
                value={editForm.price}
                onChange={(e) =>
                  setEditForm({ ...editForm, price: e.target.value })
                }
              />

              <input
                type="number"
                placeholder="السعر قبل الخصم"
                value={editForm.oldPrice}
                onChange={(e) =>
                  setEditForm({ ...editForm, oldPrice: e.target.value })
                }
              />

              <input
                type="number"
                placeholder="الكمية"
                value={editForm.stock}
                onChange={(e) =>
                  setEditForm({ ...editForm, stock: e.target.value })
                }
              />

              <select
                value={editForm.unit}
                onChange={(e) =>
                  setEditForm({ ...editForm, unit: e.target.value })
                }
              >
                <option value="قطعة">قطعة</option>
                <option value="كيلو">كيلو</option>
                <option value="جرام">جرام</option>
                <option value="لتر">لتر</option>
                <option value="عبوة">عبوة</option>
                <option value="كرتونة">كرتونة</option>
                <option value="علبة">علبة</option>
                <option value="وجبة">وجبة</option>
              </select>

              <input
                type="file"
                accept="image/*"
                onChange={handleEditImageChange}
              />

              <select
                value={editForm.isAvailable ? "true" : "false"}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    isAvailable: e.target.value === "true",
                  })
                }
              >
                <option value="true">متاح</option>
                <option value="false">غير متاح</option>
              </select>

              <select
                value={editForm.isBestSeller ? "true" : "false"}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    isBestSeller: e.target.value === "true",
                  })
                }
              >
                <option value="false">ليس الأكثر طلبًا</option>
                <option value="true">الأكثر طلبًا</option>
              </select>

              <select
                value={editForm.isOffer ? "true" : "false"}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    isOffer: e.target.value === "true",
                  })
                }
              >
                <option value="false">ليس عرض</option>
                <option value="true">عرض</option>
              </select>

              <button type="submit" disabled={loading}>
                {loading ? "جاري الحفظ..." : "حفظ التعديل"}
              </button>
            </form>

            {editForm.image && (
              <div className="image-preview-box">
                <span>معاينة صورة المنتج</span>
                <img src={editForm.image} alt="preview" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}